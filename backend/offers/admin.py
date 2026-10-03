from django.contrib import admin

from .models import Coupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'type', 'value', 'valid_from', 'valid_to', 'used_count', 'max_uses')
    search_fields = ('code',)
    list_filter = ('type',)
