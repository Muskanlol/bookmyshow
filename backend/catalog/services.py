from django.db import transaction
from django.utils import timezone

from bookings.models import BookedSeat, SeatHold

from .models import Screen, SeatTemplate, Tier


class LayoutError(Exception):
    def __init__(self, detail):
        super().__init__(detail)
        self.detail = detail


def row_label_for(index):
    """1 -> A, 26 -> Z, 27 -> AA."""
    letters = []
    number = index
    while number > 0:
        number, remainder = divmod(number - 1, 26)
        letters.append(chr(65 + remainder))
    return ''.join(reversed(letters))


def _tier_by_row(rows, row_tiers):
    covered = {}
    for block in row_tiers:
        start = block['from_row']
        end = block['to_row']
        tier = block['tier']
        if tier not in Tier.values:
            raise LayoutError('Unknown seat tier.')
        if start < 1 or end > rows or start > end:
            raise LayoutError('A tier range sits outside the grid.')
        for row in range(start, end + 1):
            if row in covered:
                raise LayoutError(f'Row {row} is assigned more than one tier.')
            covered[row] = tier
    missing = [row for row in range(1, rows + 1) if row not in covered]
    if missing:
        raise LayoutError('Every row needs a tier.')
    return covered


def generate_seats(screen, rows, cols, row_tiers, aisle_columns=None):
    aisles = set(aisle_columns or [])
    if any(column < 1 or column > cols for column in aisles):
        raise LayoutError('Aisle columns must be between 1 and the column count.')
    if len(aisles) >= cols:
        raise LayoutError('Leave at least one column of seats.')
    tier_by_row = _tier_by_row(rows, row_tiers)
    now = timezone.now()

    with transaction.atomic():
        screen = Screen.objects.select_for_update().get(pk=screen.pk)
        if BookedSeat.objects.filter(seat__screen=screen, is_active=True).exists():
            raise LayoutError(
                'This screen has confirmed bookings. Cancel them before rebuilding the layout.'
            )
        if SeatHold.objects.filter(seat__screen=screen, expires_at__gt=now).exists():
            raise LayoutError(
                'This screen has seats on hold. Wait until they expire before rebuilding the layout.'
            )
        BookedSeat.objects.filter(seat__screen=screen).update(seat=None)
        SeatTemplate.objects.filter(screen=screen).delete()

        seats = []
        for row in range(1, rows + 1):
            seat_number = 0
            label = row_label_for(row)
            for col in range(1, cols + 1):
                if col in aisles:
                    seats.append(SeatTemplate(
                        screen=screen,
                        row_index=row,
                        col_index=col,
                        row_label=label,
                        number=None,
                        tier='',
                        is_blocked=False,
                        is_aisle=True,
                    ))
                    continue
                seat_number += 1
                seats.append(SeatTemplate(
                    screen=screen,
                    row_index=row,
                    col_index=col,
                    row_label=label,
                    number=seat_number,
                    tier=tier_by_row[row],
                    is_blocked=False,
                    is_aisle=False,
                ))
        SeatTemplate.objects.bulk_create(seats)
        screen.total_rows = rows
        screen.total_cols = cols
        screen.save(update_fields=['total_rows', 'total_cols'])
    return screen


def update_seats(screen, updates):
    if not updates:
        raise LayoutError('Provide at least one seat to update.')
    seat_ids = [item['id'] for item in updates]
    if len(seat_ids) != len(set(seat_ids)):
        raise LayoutError('The same seat is listed more than once.')

    with transaction.atomic():
        locked = {
            seat.id: seat
            for seat in SeatTemplate.objects.select_for_update().filter(screen=screen, id__in=seat_ids)
        }
        if len(locked) != len(seat_ids):
            raise LayoutError('One or more seats do not belong to this screen.')
        for item in updates:
            seat = locked[item['id']]
            if seat.is_aisle:
                raise LayoutError(
                    f'Row {seat.row_label}, column {seat.col_index} is an aisle and cannot be edited.'
                )
            if 'tier' in item:
                seat.tier = item['tier']
            if 'is_blocked' in item:
                seat.is_blocked = item['is_blocked']
            seat.save(update_fields=['tier', 'is_blocked'])
    return screen
