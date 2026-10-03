from datetime import timedelta
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from offers.models import Coupon
from shows.models import Show

from .models import BookedSeat, Booking, Payment, SeatHold
from .services import BookingError, cancel_booking, purge_expired_holds


def money(value):
    return Decimal(value).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def show_prices(show):
    return {row.tier: row.price for row in show.tier_prices.all()}


def price_seats(seats, prices):
    rows = []
    subtotal = Decimal('0.00')
    for seat in seats:
        price = prices.get(seat.tier)
        if price is None:
            raise BookingError(f'No price is set for {seat.tier or "this"} seats.')
        rows.append((seat, price))
        subtotal += price
    return rows, money(subtotal)


def coupon_discount(coupon, subtotal):
    if coupon.type == Coupon.Type.PERCENT:
        discount = money(subtotal * coupon.value / Decimal('100'))
    else:
        discount = money(coupon.value)
    if discount > subtotal:
        discount = subtotal
    return discount


def load_coupon(code, now):
    coupon = (
        Coupon.objects.select_for_update()
        .filter(code=code.strip().upper())
        .first()
    )
    if coupon is None:
        raise BookingError('That coupon code is not valid.')
    if coupon.valid_from > now or coupon.valid_to < now:
        raise BookingError('That coupon is not active right now.')
    if coupon.used_count >= coupon.max_uses:
        raise BookingError('That coupon has been used up.')
    return coupon


def totals(subtotal, discount=Decimal('0.00')):
    fee = money(settings.CONVENIENCE_FEE)
    discount = money(discount)
    return {
        'subtotal': money(subtotal),
        'fee': fee,
        'discount': discount,
        'total': money(subtotal - discount + fee),
    }


@transaction.atomic
def hold_seats(user, show_id, seat_ids):
    purge_expired_holds()
    if not seat_ids:
        raise BookingError('Select at least one seat.')
    unique_ids = list(dict.fromkeys(seat_ids))
    if len(unique_ids) > 10:
        raise BookingError('You can book up to 10 seats at a time.')

    try:
        show = Show.objects.select_for_update().get(pk=show_id)
    except Show.DoesNotExist as exc:
        raise BookingError('This show does not exist.') from exc
    if show.status != Show.Status.SCHEDULED:
        raise BookingError('This show is not open for booking.')
    if show.start_time <= timezone.now():
        raise BookingError('This show has already started.')

    pending = list(
        Booking.objects.select_for_update()
        .filter(user=user, status=Booking.Status.PENDING)
        .order_by('id')
    )
    for booking in pending:
        booking.holds.all().delete()
        booking.status = Booking.Status.EXPIRED
        booking.save(update_fields=['status', 'updated_at'])

    from catalog.models import SeatTemplate

    seats = list(
        SeatTemplate.objects.select_for_update()
        .filter(id__in=unique_ids, screen_id=show.screen_id)
        .order_by('id')
    )
    if len(seats) != len(unique_ids):
        raise BookingError('One or more seats are not on this screen.')
    for seat in seats:
        if seat.is_aisle or seat.is_blocked or not seat.label:
            raise BookingError('One of those seats cannot be booked.')

    now = timezone.now()
    booked_ids = set(
        BookedSeat.objects.filter(show=show, seat_id__in=unique_ids, is_active=True)
        .values_list('seat_id', flat=True)
    )
    held_ids = set(
        SeatHold.objects.filter(show=show, seat_id__in=unique_ids, expires_at__gt=now)
        .values_list('seat_id', flat=True)
    )
    conflict = booked_ids | held_ids
    if conflict:
        labels = [seat.label for seat in seats if seat.id in conflict]
        raise BookingError(f'Already taken: {", ".join(labels)}.')

    priced, subtotal = price_seats(seats, show_prices(show))
    amounts = totals(subtotal)
    expires_at = now + timedelta(minutes=settings.SEAT_HOLD_MINUTES)
    booking = Booking.objects.create(
        user=user,
        show=show,
        status=Booking.Status.PENDING,
        expires_at=expires_at,
        **amounts,
    )
    SeatHold.objects.bulk_create([
        SeatHold(show=show, seat=seat, user=user, booking=booking, expires_at=expires_at)
        for seat, _price in priced
    ])
    return booking


def _pending_booking(user, booking_id):
    try:
        booking = (
            Booking.objects.select_for_update()
            .select_related('show')
            .get(pk=booking_id, user=user)
        )
    except Booking.DoesNotExist as exc:
        raise BookingError('Booking not found.') from exc
    now = timezone.now()
    if booking.status != Booking.Status.PENDING:
        raise BookingError('This booking is not waiting for payment.')
    if booking.expires_at is None or booking.expires_at <= now:
        booking.holds.all().delete()
        booking.status = Booking.Status.EXPIRED
        booking.save(update_fields=['status', 'updated_at'])
        raise BookingError('Your seats were released. Pick them again.')
    holds = list(booking.holds.select_related('seat').order_by('seat__row_index', 'seat__col_index'))
    if not holds:
        raise BookingError('Your seats were released. Pick them again.')
    return booking, holds, now


@transaction.atomic
def quote_booking(user, booking_id, coupon_code=''):
    booking, holds, now = _pending_booking(user, booking_id)
    priced, subtotal = price_seats([hold.seat for hold in holds], show_prices(booking.show))
    discount = Decimal('0.00')
    code = (coupon_code or '').strip()
    if code:
        discount = coupon_discount(load_coupon(code, now), subtotal)
    amounts = totals(subtotal, discount)
    booking.subtotal = amounts['subtotal']
    booking.fee = amounts['fee']
    booking.discount = amounts['discount']
    booking.total = amounts['total']
    booking.save(update_fields=['subtotal', 'fee', 'discount', 'total', 'updated_at'])
    return booking


@transaction.atomic
def pay_booking(user, booking_id, coupon_code=''):
    booking, holds, now = _pending_booking(user, booking_id)
    seats = [hold.seat for hold in holds]
    priced, subtotal = price_seats(seats, show_prices(booking.show))
    discount = Decimal('0.00')
    coupon = None
    code = (coupon_code or '').strip()
    if code:
        coupon = load_coupon(code, now)
        discount = coupon_discount(coupon, subtotal)
    amounts = totals(subtotal, discount)

    seat_ids = [seat.id for seat, _price in priced]
    already = set(
        BookedSeat.objects.filter(show=booking.show, seat_id__in=seat_ids, is_active=True)
        .values_list('seat_id', flat=True)
    )
    if already:
        labels = [seat.label for seat, _price in priced if seat.id in already]
        raise BookingError(f'Already taken: {", ".join(labels)}.')

    try:
        BookedSeat.objects.bulk_create([
            BookedSeat(
                booking=booking,
                show=booking.show,
                seat=seat,
                seat_label=seat.label,
                price=price,
                is_active=True,
            )
            for seat, price in priced
        ])
    except IntegrityError as exc:
        raise BookingError('A seat was just booked by someone else.') from exc

    booking.holds.all().delete()
    booking.status = Booking.Status.CONFIRMED
    booking.expires_at = None
    booking.subtotal = amounts['subtotal']
    booking.fee = amounts['fee']
    booking.discount = amounts['discount']
    booking.total = amounts['total']
    booking.save(update_fields=[
        'status', 'expires_at', 'subtotal', 'fee', 'discount', 'total', 'updated_at',
    ])
    if coupon is not None:
        coupon.used_count += 1
        coupon.save(update_fields=['used_count'])
    Payment.objects.create(
        booking=booking,
        provider='mock',
        provider_ref=f'mock-{booking.id}',
        amount=amounts['total'],
        status=Payment.Status.SUCCESS,
        paid_at=now,
    )
    return booking


@transaction.atomic
def cancel_customer_booking(user, booking_id):
    try:
        booking = Booking.objects.select_for_update().get(pk=booking_id, user=user)
    except Booking.DoesNotExist as exc:
        raise BookingError('Booking not found.') from exc
    if booking.status == Booking.Status.PENDING:
        booking.holds.all().delete()
        booking.status = Booking.Status.EXPIRED
        booking.save(update_fields=['status', 'updated_at'])
        return booking
    if booking.status != Booking.Status.CONFIRMED:
        raise BookingError('This booking cannot be cancelled.')
    return cancel_booking(booking.id)
