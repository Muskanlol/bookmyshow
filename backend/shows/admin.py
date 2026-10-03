from django.contrib import admin

from .models import Show, ShowTierPrice


class ShowTierPriceInline(admin.TabularInline):
    model = ShowTierPrice
    extra = 0


@admin.register(Show)
class ShowAdmin(admin.ModelAdmin):
    list_display = ('movie', 'screen', 'start_time', 'end_time', 'status')
    list_filter = ('status', 'screen__theatre__city', 'movie')
    search_fields = ('movie__title', 'screen__name', 'screen__theatre__name')
    inlines = [ShowTierPriceInline]


@admin.register(ShowTierPrice)
class ShowTierPriceAdmin(admin.ModelAdmin):
    list_display = ('show', 'tier', 'price')
    list_filter = ('tier',)
