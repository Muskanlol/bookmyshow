from django.contrib import admin, messages

from .models import BookedSeat, Booking, Payment, SeatHold
from .services import BookingError, cancel_booking


class BookedSeatInline(admin.TabularInline):
    model = BookedSeat
    extra = 0
    can_delete = False
    readonly_fields = ('show', 'seat', 'seat_label', 'price', 'is_active')


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ('provider', 'provider_ref', 'amount', 'status', 'paid_at')
    can_delete = False


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'show', 'status', 'total', 'created_at')
    list_filter = ('status',)
    search_fields = ('user__name', 'user__email', 'user__phone')
    list_select_related = ('user', 'show__movie')
    inlines = [BookedSeatInline, PaymentInline]

    def save_model(self, request, obj, form, change):
        if not change or 'status' not in form.changed_data:
            super().save_model(request, obj, form, change)
            return
        previous = Booking.objects.filter(pk=obj.pk).values_list('status', flat=True).first()
        if previous == Booking.Status.CANCELLED and obj.status != Booking.Status.CANCELLED:
            messages.error(request, 'Cancelled bookings stay cancelled.')
            return
        if obj.status == Booking.Status.CANCELLED and previous != Booking.Status.CANCELLED:
            try:
                cancel_booking(obj.pk)
            except BookingError as exc:
                messages.error(request, exc.detail)
                return
            messages.success(request, 'Booking cancelled and seats released.')
            return
        super().save_model(request, obj, form, change)


@admin.register(BookedSeat)
class BookedSeatAdmin(admin.ModelAdmin):
    list_display = ('booking', 'show', 'seat_label', 'price', 'is_active')
    list_filter = ('is_active',)


@admin.register(SeatHold)
class SeatHoldAdmin(admin.ModelAdmin):
    list_display = ('show', 'seat', 'user', 'expires_at')
    list_select_related = ('show', 'user', 'seat')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('booking', 'provider', 'amount', 'status', 'paid_at')
    list_filter = ('status', 'provider')
