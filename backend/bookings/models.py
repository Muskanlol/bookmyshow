from django.conf import settings
from django.db import models
from django.db.models import Q

from catalog.models import SeatTemplate
from shows.models import Show


class Booking(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        CANCELLED = 'cancelled', 'Cancelled'
        EXPIRED = 'expired', 'Expired'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='bookings',
    )
    show = models.ForeignKey(Show, on_delete=models.PROTECT, related_name='bookings')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f'Booking {self.pk}'


class BookedSeat(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='booked_seats')
    show = models.ForeignKey(Show, on_delete=models.PROTECT, related_name='booked_seats')
    seat = models.ForeignKey(
        SeatTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='booked_seats',
    )
    seat_label = models.CharField(max_length=10)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['id']
        constraints = [
            models.UniqueConstraint(
                fields=['show', 'seat'],
                condition=Q(is_active=True),
                name='unique_active_booked_seat',
            ),
        ]
        indexes = [
            models.Index(fields=['show', 'seat']),
        ]

    def __str__(self):
        return self.seat_label


class SeatHold(models.Model):
    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name='seat_holds')
    seat = models.ForeignKey(SeatTemplate, on_delete=models.CASCADE, related_name='seat_holds')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='seat_holds',
    )
    booking = models.ForeignKey(
        Booking,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='holds',
    )
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['expires_at']),
            models.Index(fields=['show', 'seat']),
        ]

    def __str__(self):
        return f'Hold {self.seat_id} until {self.expires_at:%H:%M}'


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SUCCESS = 'success', 'Success'
        FAILED = 'failed', 'Failed'
        REFUNDED = 'refunded', 'Refunded'

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='payments')
    provider = models.CharField(max_length=30, default='mock')
    provider_ref = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.provider} {self.amount} {self.status}'
