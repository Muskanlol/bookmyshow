from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .models import Booking, Payment, SeatHold


class BookingError(Exception):
    def __init__(self, detail):
        super().__init__(detail)
        self.detail = detail


@transaction.atomic
def cancel_booking(booking_id):
    booking = Booking.objects.select_for_update().get(pk=booking_id)
    if booking.status == Booking.Status.CANCELLED:
        raise BookingError('This booking is already cancelled.')
    if booking.status == Booking.Status.EXPIRED:
        raise BookingError('This booking has expired.')
    booking.status = Booking.Status.CANCELLED
    booking.cancelled_at = timezone.now()
    booking.save(update_fields=['status', 'cancelled_at', 'updated_at'])
    booking.booked_seats.filter(is_active=True).update(is_active=False)
    booking.holds.all().delete()
    booking.payments.filter(status=Payment.Status.SUCCESS).update(status=Payment.Status.REFUNDED)
    return booking


def purge_expired_holds(now=None):
    now = now or timezone.now()
    expired_ids = list(
        Booking.objects.filter(
            status=Booking.Status.PENDING,
            expires_at__isnull=False,
            expires_at__lte=now,
        ).values_list('id', flat=True)
    )
    holds = SeatHold.objects.filter(Q(expires_at__lte=now) | Q(booking_id__in=expired_ids))
    hold_count = holds.count()
    holds.delete()
    booking_count = Booking.objects.filter(id__in=expired_ids).update(status=Booking.Status.EXPIRED)
    return hold_count, booking_count
