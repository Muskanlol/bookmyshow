from datetime import datetime, timedelta, time
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Avg
from django.utils import timezone

from accounts.models import User
from bookings.models import BookedSeat, Booking, Payment, SeatHold
from bookings.services import cancel_booking
from catalog.models import CastMember, City, Movie, Review, Screen, SeatTemplate, Theatre
from catalog.services import generate_seats
from config.utils import IST, local_day_bounds
from offers.models import Coupon
from shows.models import Show, ShowTierPrice
from shows.services import bulk_create_shows, show_end

PRICES = [
    {'tier': 'premier', 'price': Decimal('400.00')},
    {'tier': 'gold', 'price': Decimal('250.00')},
    {'tier': 'silver', 'price': Decimal('150.00')},
]
LAYOUT = {
    'rows': 8,
    'cols': 10,
    'row_tiers': [
        {'from_row': 1, 'to_row': 2, 'tier': 'premier'},
        {'from_row': 3, 'to_row': 5, 'tier': 'gold'},
        {'from_row': 6, 'to_row': 8, 'tier': 'silver'},
    ],
    'aisle_columns': [3, 8],
}
SLOTS = [time(10, 0), time(14, 0), time(18, 30)]


class Command(BaseCommand):
    help = 'Load cities, movies, theatres, screens, shows, and sample bookings.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete the current catalog and bookings, then load them again.',
        )

    def handle(self, *args, **options):
        if City.objects.exists() and not options['reset']:
            self.stdout.write('Data already exists. Re-run with --reset to rebuild it.')
            return
        with transaction.atomic():
            if options['reset']:
                wipe()
            build()
        self.stdout.write(self.style.SUCCESS('Seed complete.'))
        self.stdout.write('Admin login: admin@bookmyshow.test / Admin@12345')
        self.stdout.write('Customer (for later): customer@bookmyshow.test / Customer@12345')
        self.stdout.write(
            f"Cities {City.objects.count()}, movies {Movie.objects.count()}, "
            f"shows {Show.objects.count()}, bookings {Booking.objects.count()}."
        )


def wipe():
    Payment.objects.all().delete()
    BookedSeat.objects.all().delete()
    SeatHold.objects.all().delete()
    Booking.objects.all().delete()
    Review.objects.all().delete()
    ShowTierPrice.objects.all().delete()
    Show.objects.all().delete()
    SeatTemplate.objects.all().delete()
    Screen.objects.all().delete()
    Theatre.objects.all().delete()
    CastMember.objects.all().delete()
    Movie.objects.all().delete()
    Coupon.objects.all().delete()
    City.objects.all().delete()
    User.objects.all().delete()


def build():
    User.objects.create_superuser(
        email='admin@bookmyshow.test',
        password='Admin@12345',
        name='Admin',
    )
    customers = [
        User.objects.create_user(
            email='customer@bookmyshow.test',
            password='Customer@12345',
            name='Asha Iyer',
            phone='9876543210',
            role=User.Role.CUSTOMER,
        ),
        User.objects.create_user(
            email='ravi@bookmyshow.test',
            password='Customer@12345',
            name='Ravi Kapoor',
            phone='9876543211',
            role=User.Role.CUSTOMER,
        ),
    ]

    cities = {
        'mumbai': City.objects.create(name='Mumbai', state='Maharashtra'),
        'delhi': City.objects.create(name='New Delhi', state='Delhi'),
        'bengaluru': City.objects.create(name='Bengaluru', state='Karnataka'),
    }
    theatres = [
        Theatre.objects.create(
            city=cities['mumbai'],
            name='Galaxy Cinemas',
            address='12 Link Road, Bandra',
            amenities=['Parking', 'Food court'],
        ),
        Theatre.objects.create(
            city=cities['mumbai'],
            name='Harbour Screens',
            address='4 Dock Street, Colaba',
            amenities=['Dolby Atmos'],
        ),
        Theatre.objects.create(
            city=cities['delhi'],
            name='Metroplex',
            address='80 Ring Road, Saket',
            amenities=['Parking', 'Recliner'],
        ),
        Theatre.objects.create(
            city=cities['bengaluru'],
            name='Lakeview Cinemas',
            address='2 Lake Road, Indiranagar',
            amenities=['Food court'],
        ),
    ]
    screen_plan = [
        (theatres[0], 'Screen 1'),
        (theatres[0], 'Screen 2'),
        (theatres[1], 'Screen 1'),
        (theatres[2], 'Screen 1'),
        (theatres[2], 'Screen 2'),
        (theatres[3], 'Screen 1'),
    ]
    screens = []
    for theatre, name in screen_plan:
        screen = Screen.objects.create(theatre=theatre, name=name)
        generate_seats(screen, **LAYOUT)
        screens.append(screen)

    today = timezone.localdate()
    movies = []
    for item in movie_rows(today):
        cast = item.pop('cast')
        movie = Movie.objects.create(**item)
        CastMember.objects.bulk_create([
            CastMember(movie=movie, name=name, role=role) for name, role in cast
        ])
        movies.append(movie)

    showing = [movie for movie in movies if movie.status == Movie.Status.NOW_SHOWING]
    for index, movie in enumerate(showing):
        group = screens[index * 2:(index + 1) * 2]
        if not group:
            continue
        bulk_create_shows(
            movie=movie,
            screens=group,
            date_from=today,
            date_to=today + timedelta(days=2),
            time_slots=SLOTS,
            tier_prices=PRICES,
        )

    last_bench = next(movie for movie in movies if movie.title == 'Last Bench')
    extra_screens = []
    for theatre, name in (
        (theatres[0], 'Screen 3'),
        (theatres[1], 'Screen 2'),
        (theatres[2], 'Screen 3'),
        (theatres[3], 'Screen 2'),
    ):
        screen = Screen.objects.create(theatre=theatre, name=name)
        generate_seats(screen, **LAYOUT)
        extra_screens.append(screen)
    bulk_create_shows(
        movie=last_bench,
        screens=extra_screens,
        date_from=today,
        date_to=today + timedelta(days=2),
        time_slots=SLOTS,
        tier_prices=PRICES,
    )

    now = timezone.now()
    Coupon.objects.create(
        code='SAVE50',
        type=Coupon.Type.FLAT,
        value=Decimal('50.00'),
        valid_from=now - timedelta(days=1),
        valid_to=now + timedelta(days=30),
        max_uses=100,
    )
    Coupon.objects.create(
        code='TAKE10',
        type=Coupon.Type.PERCENT,
        value=Decimal('10.00'),
        valid_from=now - timedelta(days=1),
        valid_to=now + timedelta(days=30),
        max_uses=100,
    )

    Review.objects.create(
        user=customers[0], movie=showing[0], rating=5, text='Sharp and tense.',
    )
    Review.objects.create(
        user=customers[1], movie=showing[0], rating=4, text='Worth the night show.',
    )
    Review.objects.create(
        user=customers[0], movie=showing[1], rating=4, text='Light and well acted.',
    )
    for movie in showing:
        average = movie.reviews.aggregate(value=Avg('rating'))['value']
        if average is None:
            continue
        movie.avg_rating = Decimal(str(average)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        movie.save(update_fields=['avg_rating'])

    start, end = local_day_bounds(today)
    todays = list(
        Show.objects.filter(start_time__gte=start, start_time__lt=end)
        .select_related('screen')
        .prefetch_related('tier_prices')
        .order_by('start_time', 'id')
    )
    paid_on = [
        now,
        now,
        now,
        now,
        now,
        now - timedelta(days=1),
        now - timedelta(days=1),
        now - timedelta(days=2),
    ]
    for index, when in enumerate(paid_on):
        book(todays[index], customers[index % 2], when)
    cancelled_today = book(todays[8], customers[0], now - timedelta(hours=3))
    cancel_booking(cancelled_today.pk)
    Booking.objects.filter(pk=cancelled_today.pk).update(cancelled_at=now, updated_at=now)
    cancelled_yesterday = book(todays[9], customers[1], now - timedelta(days=1))
    cancel_booking(cancelled_yesterday.pk)
    yesterday = now - timedelta(days=1)
    Booking.objects.filter(pk=cancelled_yesterday.pk).update(
        cancelled_at=yesterday,
        updated_at=yesterday,
    )
    fill_remaining_showtimes()


def book(show, user, when):
    seats = []
    for tier in ('premier', 'gold', 'gold', 'silver'):
        seat = (
            show.screen.seats.filter(is_aisle=False, is_blocked=False, tier=tier)
            .exclude(id__in=[item.id for item in seats])
            .order_by('row_index', 'col_index')
            .first()
        )
        seats.append(seat)
    prices = {row.tier: row.price for row in show.tier_prices.all()}
    subtotal = sum((prices[seat.tier] for seat in seats), Decimal('0.00'))
    fee = settings.CONVENIENCE_FEE
    booking = Booking.objects.create(
        user=user,
        show=show,
        status=Booking.Status.CONFIRMED,
        subtotal=subtotal,
        fee=fee,
        discount=Decimal('0.00'),
        total=subtotal + fee,
    )
    BookedSeat.objects.bulk_create([
        BookedSeat(
            booking=booking,
            show=show,
            seat=seat,
            seat_label=seat.label,
            price=prices[seat.tier],
            is_active=True,
        )
        for seat in seats
    ])
    Payment.objects.create(
        booking=booking,
        provider='mock',
        provider_ref=f'mock-{booking.id}',
        amount=booking.total,
        status=Payment.Status.SUCCESS,
        paid_at=when,
    )
    Booking.objects.filter(pk=booking.pk).update(created_at=when, updated_at=when)
    return booking


def _next_screen_name(theatre):
    taken = set(theatre.screens.values_list('name', flat=True))
    number = 1
    while f'Screen {number}' in taken:
        number += 1
    return f'Screen {number}'


def _slots_fit(movies):
    """True when these movies can share one screen at 10:00, 14:00, and 18:30."""
    previous_end = None
    for movie, slot in zip(movies, SLOTS):
        start = datetime.combine(datetime(2026, 1, 1).date(), slot, tzinfo=IST)
        if previous_end is not None and start < previous_end:
            return False
        previous_end = show_end(start, movie.duration_min)
    return True


def fill_remaining_showtimes():
    """Give every now-showing movie a few days of shows in each city.

    Movies that already have an upcoming show in a city are left alone, so
    existing bookings and seat holds stay on their original screens. New
    screens are added to the theatres already in that city. Three movies
    share a screen, one at each of 10:00, 14:00, and 18:30, for today and
    the next two days. Prices stay premier 400, gold 250, silver 150.
    """
    today = timezone.localdate()
    date_to = today + timedelta(days=2)
    now = timezone.now()
    movies = list(
        Movie.objects.filter(status=Movie.Status.NOW_SHOWING).order_by('title')
    )
    created_screens = 0
    created_shows = 0

    with transaction.atomic():
        return _fill_remaining_showtimes(movies, today, date_to, now, created_screens, created_shows)


def _fill_remaining_showtimes(movies, today, date_to, now, created_screens, created_shows):
    for city in City.objects.order_by('name'):
        theatres = list(
            Theatre.objects.filter(city=city, is_active=True).order_by('id')
        )
        if not theatres:
            continue
        covered = set(
            Show.objects.filter(
                status=Show.Status.SCHEDULED,
                start_time__gte=now,
                movie__status=Movie.Status.NOW_SHOWING,
                screen__theatre__city=city,
            ).values_list('movie_id', flat=True)
        )
        missing = [movie for movie in movies if movie.id not in covered]
        groups = []
        bucket = []
        for movie in missing:
            trial = bucket + [movie]
            if len(trial) <= len(SLOTS) and _slots_fit(trial):
                bucket = trial
            else:
                if bucket:
                    groups.append(bucket)
                bucket = [movie]
        if bucket:
            groups.append(bucket)

        for index, group in enumerate(groups):
            theatre = theatres[index % len(theatres)]
            screen = Screen.objects.create(
                theatre=theatre,
                name=_next_screen_name(theatre),
            )
            generate_seats(screen, **LAYOUT)
            created_screens += 1
            for slot, movie in zip(SLOTS, group):
                created_shows += len(bulk_create_shows(
                    movie=movie,
                    screens=[screen],
                    date_from=today,
                    date_to=date_to,
                    time_slots=[slot],
                    tier_prices=PRICES,
                ))
    return created_screens, created_shows


def extra_movie_rows(today):
    names = ['Asha Menon', 'Vikram Shah', 'Meera Lal', 'Karthik Raman', 'Sana Qureshi', 'Nora Ellis', 'Riya Das', 'Arul Das']
    specs = [
        ('Hindi', Movie.Status.NOW_SHOWING, 'Platform Tea', 'Drama', 'U', 118, '-6'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Second Show', 'Comedy', 'U', 112, '-9'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Old Balcony', 'Romance', 'UA', 128, '-4'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Rain Window', 'Drama', 'U', 121, '-15'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Family Table', 'Family', 'U', 116, '-11'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Market Lane', 'Comedy', 'UA', 109, '-8'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Yellow Scooter', 'Family', 'U', 104, '-2'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Third Bell', 'Thriller', 'UA', 131, '-19'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'School Gate', 'Drama', 'U', 122, '-13'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Evening Raga', 'Drama', 'U', 140, '-22'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Pocket Map', 'Adventure', 'UA', 127, '-6'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Summer Fan', 'Comedy', 'U', 108, '-17'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Corner Shop', 'Comedy', 'U', 115, '-3'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Quiet Jury', 'Thriller', 'A', 134, '-20'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Red Bicycle', 'Family', 'U', 101, '-7'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Monday Train', 'Drama', 'UA', 126, '-14'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Open Terrace', 'Romance', 'UA', 119, '-5'),
        ('Hindi', Movie.Status.NOW_SHOWING, 'Little Stage', 'Drama', 'U', 123, '-16'),
        ('English', Movie.Status.NOW_SHOWING, 'North Window', 'Drama', 'UA', 117, '-8'),
        ('English', Movie.Status.NOW_SHOWING, 'Paper Crown', 'Comedy', 'U', 106, '-3'),
        ('English', Movie.Status.NOW_SHOWING, 'Late Checkout', 'Thriller', 'A', 111, '-12'),
        ('English', Movie.Status.NOW_SHOWING, 'Silver Lobby', 'Mystery', 'UA', 120, '-18'),
        ('English', Movie.Status.NOW_SHOWING, 'Empty Gate', 'Thriller', 'UA', 129, '-6'),
        ('English', Movie.Status.NOW_SHOWING, 'City Atlas', 'Adventure', 'UA', 138, '-9'),
        ('English', Movie.Status.NOW_SHOWING, 'Soft Alarm', 'Drama', 'U', 113, '-4'),
        ('English', Movie.Status.NOW_SHOWING, 'Weekend Key', 'Comedy', 'U', 107, '-15'),
        ('English', Movie.Status.NOW_SHOWING, 'Blue Notebook', 'Drama', 'UA', 124, '-11'),
        ('English', Movie.Status.NOW_SHOWING, 'Marble Stair', 'Mystery', 'UA', 116, '-2'),
        ('English', Movie.Status.NOW_SHOWING, 'Short Wave', 'Thriller', 'A', 108, '-21'),
        ('English', Movie.Status.NOW_SHOWING, 'Hotel Lily', 'Romance', 'UA', 122, '-7'),
        ('English', Movie.Status.NOW_SHOWING, 'Quiet Orbit', 'Drama', 'U', 130, '-13'),
        ('English', Movie.Status.NOW_SHOWING, 'Glass Ticket', 'Thriller', 'UA', 114, '-5'),
        ('English', Movie.Status.NOW_SHOWING, 'Morning Ferry', 'Romance', 'U', 125, '-10'),
        ('English', Movie.Status.NOW_SHOWING, 'Low Ceiling', 'Mystery', 'A', 109, '-16'),
        ('English', Movie.Status.NOW_SHOWING, 'Park Bench', 'Comedy', 'U', 103, '-1'),
        ('English', Movie.Status.NOW_SHOWING, 'Final Draft', 'Drama', 'UA', 128, '-19'),
        ('English', Movie.Status.NOW_SHOWING, 'Orange Line', 'Action', 'UA', 119, '-8'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'River Steps', 'Drama', 'U', 132, '-6'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Temple Street', 'Drama', 'U', 127, '-14'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Night Boat', 'Thriller', 'UA', 118, '-4'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Green Notebook', 'Romance', 'U', 121, '-9'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Cousin House', 'Comedy', 'U', 114, '-11'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Rain Platform', 'Drama', 'UA', 129, '-3'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Old Radio', 'Family', 'U', 112, '-18'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Sea Wall', 'Thriller', 'A', 136, '-7'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Tea Estate', 'Drama', 'U', 141, '-20'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Second Cousin', 'Comedy', 'U', 108, '-5'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Lamp Post', 'Romance', 'UA', 123, '-12'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Market Bell', 'Comedy', 'U', 110, '-2'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Ferry Song', 'Romance', 'U', 126, '-15'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Courtyard', 'Drama', 'UA', 119, '-8'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Palm Shade', 'Family', 'U', 115, '-6'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Dust Road', 'Action', 'UA', 133, '-17'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Evening Post', 'Drama', 'U', 124, '-10'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Small Harbour', 'Adventure', 'UA', 128, '-4'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Stone Bridge', 'Thriller', 'A', 137, '-13'),
        ('Tamil', Movie.Status.NOW_SHOWING, 'Warm Kitchen', 'Family', 'U', 111, '-9'),
        ('Hindi', Movie.Status.COMING_SOON, 'Paper Moon', 'Family', 'U', 120, '12'),
        ('English', Movie.Status.COMING_SOON, 'North Station', 'Thriller', 'UA', 128, '16'),
        ('Tamil', Movie.Status.COMING_SOON, 'Lotus Hour', 'Drama', 'U', 122, '20'),
        ('Hindi', Movie.Status.COMING_SOON, 'Silver Kite', 'Family', 'U', 109, '14'),
        ('English', Movie.Status.COMING_SOON, 'City of Keys', 'Mystery', 'UA', 131, '22'),
        ('Tamil', Movie.Status.COMING_SOON, 'Red Courtyard', 'Action', 'UA', 126, '18'),
        ('Hindi', Movie.Status.COMING_SOON, 'Little Orchestra', 'Family', 'U', 117, '26'),
        ('English', Movie.Status.COMING_SOON, 'Night Library', 'Drama', 'UA', 124, '11'),
        ('Tamil', Movie.Status.COMING_SOON, 'Mango Season', 'Romance', 'U', 130, '28'),
        ('English', Movie.Status.COMING_SOON, 'Open Sea', 'Adventure', 'UA', 135, '15'),
        ('Hindi', Movie.Status.COMING_SOON, 'Third Floor', 'Thriller', 'A', 118, '19'),
        ('English', Movie.Status.COMING_SOON, 'White Bicycle', 'Comedy', 'U', 106, '13'),
        ('Tamil', Movie.Status.COMING_SOON, 'Harbour Light', 'Drama', 'U', 127, '21'),
        ('Hindi', Movie.Status.COMING_SOON, 'Quiet Parade', 'Family', 'U', 114, '17'),
        ('English', Movie.Status.COMING_SOON, 'Glass Station', 'Mystery', 'UA', 121, '24'),
        ('Tamil', Movie.Status.COMING_SOON, 'Field School', 'Family', 'U', 116, '30'),
        ('Hindi', Movie.Status.COMING_SOON, 'Orange Harbour', 'Comedy', 'U', 112, '10'),
        ('English', Movie.Status.COMING_SOON, 'Low Tide', 'Drama', 'UA', 129, '27'),
        ('Tamil', Movie.Status.COMING_SOON, 'Temple Road', 'Adventure', 'UA', 133, '23'),
    ]
    rows = []
    for index, (language, status, title, genre, certificate, duration, offset) in enumerate(specs):
        rows.append({
            'title': title,
            'description': f'A {genre.lower()} following the people around {title}.',
            'duration_min': duration,
            'language': language,
            'genre': genre,
            'certificate': certificate,
            'release_date': today + timedelta(days=int(offset)),
            'status': status,
            'avg_rating': Decimal('0') if status == Movie.Status.COMING_SOON else Decimal('3.70') + (Decimal(index % 9) / Decimal('10')),
            'cast': [(names[index % len(names)], 'Actor'), (names[(index + 3) % len(names)], 'Director')],
        })
    return rows


def movie_rows(today):
    return [
        {
            'title': 'Midnight Local',
            'description': 'A night train that never reaches the last station.',
            'duration_min': 132,
            'language': 'Hindi',
            'genre': 'Drama',
            'certificate': Movie.Certificate.UA,
            'release_date': today - timedelta(days=21),
            'status': Movie.Status.NOW_SHOWING,
            'cast': [('Asha Menon', 'Actor'), ('Vikram Shah', 'Director')],
        },
        {
            'title': 'Paper Planes',
            'description': 'Two strangers try to return a ticket that is not theirs.',
            'duration_min': 118,
            'language': 'English',
            'genre': 'Comedy',
            'certificate': Movie.Certificate.U,
            'release_date': today - timedelta(days=14),
            'status': Movie.Status.NOW_SHOWING,
            'cast': [('Meera Lal', 'Actor'), ('John Dcruz', 'Director')],
        },
        {
            'title': 'Coast Road',
            'description': 'A driver keeps a secret along a highway that floods at dusk.',
            'duration_min': 141,
            'language': 'Tamil',
            'genre': 'Thriller',
            'certificate': Movie.Certificate.A,
            'release_date': today - timedelta(days=7),
            'status': Movie.Status.NOW_SHOWING,
            'cast': [('Karthik Raman', 'Actor'), ('Divya Nair', 'Actor')],
        },
        {
            'title': 'Northern Lights',
            'description': 'A family trip that starts a week later than planned.',
            'duration_min': 126,
            'language': 'Hindi',
            'genre': 'Family',
            'certificate': Movie.Certificate.U,
            'release_date': today + timedelta(days=30),
            'status': Movie.Status.COMING_SOON,
            'cast': [('Sana Qureshi', 'Actor'), ('Arun Bose', 'Director')],
        },
        {
            'title': 'Red Signal',
            'description': 'A signalman has one minute to stop a train that should not be moving.',
            'duration_min': 128,
            'language': 'Hindi',
            'genre': 'Action',
            'certificate': Movie.Certificate.UA,
            'release_date': today - timedelta(days=10),
            'status': Movie.Status.NOW_SHOWING,
            'avg_rating': Decimal('4.20'),
            'cast': [('Imran Qadri', 'Actor'), ('Leela Bose', 'Actor')],
        },
        {
            'title': 'Glass House',
            'description': 'A weekend on a cliff ends when the reflections stop matching the room.',
            'duration_min': 114,
            'language': 'English',
            'genre': 'Mystery',
            'certificate': Movie.Certificate.UA,
            'release_date': today - timedelta(days=18),
            'status': Movie.Status.NOW_SHOWING,
            'avg_rating': Decimal('4.00'),
            'cast': [('Nora Ellis', 'Actor'), ('Sam Wright', 'Director')],
        },
        {
            'title': 'Salt Wind',
            'description': 'Two people keep meeting on a ferry that only runs until dusk.',
            'duration_min': 136,
            'language': 'Tamil',
            'genre': 'Romance',
            'certificate': Movie.Certificate.U,
            'release_date': today - timedelta(days=5),
            'status': Movie.Status.NOW_SHOWING,
            'avg_rating': Decimal('4.40'),
            'cast': [('Anitha Rao', 'Actor'), ('Hari Menon', 'Actor')],
        },
        {
            'title': 'Night Bazaar',
            'description': 'A cook, a cousin, and a missing recipe take over one loud street.',
            'duration_min': 121,
            'language': 'Hindi',
            'genre': 'Comedy',
            'certificate': Movie.Certificate.U,
            'release_date': today - timedelta(days=12),
            'status': Movie.Status.NOW_SHOWING,
            'avg_rating': Decimal('3.80'),
            'cast': [('Pooja Seth', 'Actor'), ('Dev Kapoor', 'Actor')],
        },
        {
            'title': 'Blue Ticket',
            'description': 'The last seat in the hall belongs to someone who never arrives.',
            'duration_min': 109,
            'language': 'English',
            'genre': 'Thriller',
            'certificate': Movie.Certificate.A,
            'release_date': today - timedelta(days=3),
            'status': Movie.Status.NOW_SHOWING,
            'avg_rating': Decimal('4.10'),
            'cast': [('Elena Brooks', 'Actor'), ('Mark Hale', 'Director')],
        },
        {
            'title': 'Last Bench',
            'description': 'A quiet student starts answering for a friend who has left town.',
            'duration_min': 124,
            'language': 'Hindi',
            'genre': 'Drama',
            'certificate': Movie.Certificate.U,
            'release_date': today - timedelta(days=28),
            'status': Movie.Status.NOW_SHOWING,
            'avg_rating': Decimal('4.60'),
            'cast': [('Riya Das', 'Actor'), ('Manoj Pillai', 'Director')],
        },
        {
            'title': 'Winter Radio',
            'description': 'A family keeps a station on through the first snow of the year.',
            'duration_min': 119,
            'language': 'Hindi',
            'genre': 'Family',
            'certificate': Movie.Certificate.U,
            'release_date': today + timedelta(days=18),
            'status': Movie.Status.COMING_SOON,
            'cast': [('Farah Khan', 'Actor'), ('Neil Dutta', 'Actor')],
        },
        {
            'title': 'Copper Lane',
            'description': 'A map drawn in a tea shop leads out of the city before sunrise.',
            'duration_min': 133,
            'language': 'Tamil',
            'genre': 'Adventure',
            'certificate': Movie.Certificate.UA,
            'release_date': today + timedelta(days=24),
            'status': Movie.Status.COMING_SOON,
            'cast': [('Kavya Iyer', 'Actor'), ('Arul Das', 'Director')],
        },
        *extra_movie_rows(today),
    ]
