from collections import defaultdict
from datetime import datetime, timedelta

from django.conf import settings
from django.db import transaction

from catalog.models import Movie, Screen
from config.utils import IST, as_aware

from .models import Show, ShowTierPrice


class ShowError(Exception):
    def __init__(self, detail, conflicts=None):
        super().__init__(detail)
        self.detail = detail
        self.conflicts = conflicts or []


BLOCKING_STATUSES = (Show.Status.SCHEDULED, Show.Status.COMPLETED)


def show_end(start, duration_min):
    return start + timedelta(minutes=duration_min + settings.SHOW_GAP_MINUTES)


def prices_to_map(tier_prices):
    mapping = {}
    for item in tier_prices:
        tier = item['tier']
        if tier in mapping:
            raise ShowError('Duplicate tier price.')
        mapping[tier] = item['price']
    return mapping


def screen_tiers(screen):
    return set(
        screen.seats.filter(is_aisle=False).exclude(tier='').values_list('tier', flat=True)
    )


def assert_can_price(screen, price_map):
    if not screen.theatre.is_active:
        raise ShowError(f'{screen.theatre.name} is inactive.')
    required = screen_tiers(screen)
    if not required:
        raise ShowError(f'{screen.name} has no seats yet.')
    missing = sorted(required - set(price_map))
    if missing:
        raise ShowError(f'{screen.name} is missing prices for: {", ".join(missing)}.')


def find_overlap(screen_id, start, end, exclude_show_id=None):
    existing = Show.objects.filter(
        screen_id=screen_id,
        status__in=BLOCKING_STATUSES,
        start_time__lt=end,
        end_time__gt=start,
    )
    if exclude_show_id:
        existing = existing.exclude(pk=exclude_show_id)
    return existing.order_by('start_time').first()


def _conflict_payload(screen, start, other):
    return {
        'screen_id': screen.id,
        'screen_name': screen.name,
        'start_time': start.isoformat(),
        'conflicts_with': other.id,
    }


def _save_prices(show, price_map, required):
    ShowTierPrice.objects.bulk_create([
        ShowTierPrice(show=show, tier=tier, price=price)
        for tier, price in price_map.items()
        if tier in required
    ])


def _unique_screens(screens):
    unique = []
    seen = set()
    for screen in screens:
        if screen.id in seen:
            continue
        seen.add(screen.id)
        unique.append(screen)
    return unique


def create_show(movie, screen, start_time, tier_prices):
    start = as_aware(start_time)
    end = show_end(start, movie.duration_min)
    price_map = prices_to_map(tier_prices)
    if movie.status == Movie.Status.ENDED:
        raise ShowError('Cannot schedule a show for a movie that has ended.')

    with transaction.atomic():
        screen = Screen.objects.select_for_update().select_related('theatre').get(pk=screen.pk)
        assert_can_price(screen, price_map)
        conflict = find_overlap(screen.id, start, end)
        if conflict:
            raise ShowError(
                'This screen already has a show in that window.',
                [_conflict_payload(screen, start, conflict)],
            )
        show = Show.objects.create(
            movie=movie,
            screen=screen,
            start_time=start,
            end_time=end,
            status=Show.Status.SCHEDULED,
        )
        _save_prices(show, price_map, screen_tiers(screen))
    return show


def update_show(
    show,
    *,
    start_time=None,
    status=None,
    tier_prices=None,
    change_start=False,
    change_status=False,
    change_prices=False,
):
    with transaction.atomic():
        locked = (
            Show.objects.select_for_update()
            .select_related('movie', 'screen__theatre')
            .get(pk=show.pk)
        )
        screen = Screen.objects.select_for_update().select_related('theatre').get(pk=locked.screen_id)
        new_start = as_aware(start_time) if change_start else locked.start_time
        new_status = status if change_status else locked.status
        new_end = show_end(new_start, locked.movie.duration_min) if change_start else locked.end_time
        has_tickets = locked.booked_seats.filter(is_active=True).exists()

        if change_start and has_tickets:
            raise ShowError('This show has confirmed seats. Cancel those bookings before moving it.')
        if new_status == Show.Status.CANCELLED and has_tickets:
            raise ShowError('Cancel the confirmed bookings before cancelling this show.')
        if new_status in BLOCKING_STATUSES:
            if locked.movie.status == Movie.Status.ENDED and locked.status not in BLOCKING_STATUSES:
                raise ShowError('Cannot schedule a show for a movie that has ended.')
            conflict = find_overlap(screen.id, new_start, new_end, exclude_show_id=locked.pk)
            if conflict:
                raise ShowError(
                    'This screen already has a show in that window.',
                    [_conflict_payload(screen, new_start, conflict)],
                )
            if not screen.theatre.is_active and locked.status not in BLOCKING_STATUSES:
                raise ShowError(f'{screen.theatre.name} is inactive.')

        price_map = None
        required = screen_tiers(screen)
        if change_prices:
            price_map = prices_to_map(tier_prices)
            assert_can_price(screen, price_map)

        locked.start_time = new_start
        locked.end_time = new_end
        locked.status = new_status
        locked.save(update_fields=['start_time', 'end_time', 'status'])
        if price_map is not None:
            locked.tier_prices.all().delete()
            _save_prices(locked, price_map, required)
    return locked


def _intra_conflicts(planned):
    grouped = defaultdict(list)
    for item in planned:
        grouped[item['screen'].id].append(item)
    conflicts = []
    for screen_id, items in grouped.items():
        items.sort(key=lambda item: item['start'])
        for index, item in enumerate(items):
            for other in items[index + 1:]:
                if other['start'] >= item['end']:
                    break
                conflicts.append({
                    'screen_id': screen_id,
                    'start_time': item['start'].isoformat(),
                    'overlaps_start_time': other['start'].isoformat(),
                })
    return conflicts


def bulk_create_shows(movie, screens, date_from, date_to, time_slots, tier_prices):
    screens = _unique_screens(screens)
    if not screens:
        raise ShowError('Choose at least one screen.')
    if date_to < date_from:
        raise ShowError('date_to must be on or after date_from.')
    day_count = (date_to - date_from).days + 1
    if day_count > 14:
        raise ShowError('Date range cannot be longer than 14 days.')
    if len(time_slots) > 6:
        raise ShowError('Choose at most 6 time slots.')
    if len(screens) > 10:
        raise ShowError('Choose at most 10 screens.')
    if movie.status == Movie.Status.ENDED:
        raise ShowError('Cannot schedule a show for a movie that has ended.')

    price_map = prices_to_map(tier_prices)
    planned = []
    for screen in screens:
        for offset in range(day_count):
            day = date_from + timedelta(days=offset)
            for slot in time_slots:
                start = datetime.combine(day, slot, tzinfo=IST)
                planned.append({
                    'screen': screen,
                    'start': start,
                    'end': show_end(start, movie.duration_min),
                })

    conflicts = _intra_conflicts(planned)
    if conflicts:
        raise ShowError('Those time slots overlap each other on the same screen.', conflicts)

    created = []
    with transaction.atomic():
        locked_screens = list(
            Screen.objects.select_for_update()
            .select_related('theatre')
            .filter(id__in=[screen.id for screen in screens])
            .order_by('id')
        )
        locked_by_id = {screen.id: screen for screen in locked_screens}
        if len(locked_by_id) != len(screens):
            raise ShowError('One or more screens do not exist.')

        db_conflicts = []
        required_by_screen = {}
        for screen in locked_screens:
            assert_can_price(screen, price_map)
            required_by_screen[screen.id] = screen_tiers(screen)
        for item in planned:
            screen = locked_by_id[item['screen'].id]
            conflict = find_overlap(screen.id, item['start'], item['end'])
            if conflict:
                db_conflicts.append(_conflict_payload(screen, item['start'], conflict))
        if db_conflicts:
            raise ShowError('One or more shows overlap an existing show.', db_conflicts)

        for item in planned:
            screen = locked_by_id[item['screen'].id]
            show = Show.objects.create(
                movie=movie,
                screen=screen,
                start_time=item['start'],
                end_time=item['end'],
                status=Show.Status.SCHEDULED,
            )
            _save_prices(show, price_map, required_by_screen[screen.id])
            created.append(show)
    return created
