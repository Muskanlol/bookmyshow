from django.contrib import admin

from .models import CastMember, City, Movie, Review, Screen, SeatTemplate, Theatre


class CastInline(admin.TabularInline):
    model = CastMember
    extra = 1


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ('name', 'state')
    search_fields = ('name', 'state')


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('title', 'language', 'genre', 'certificate', 'status', 'release_date', 'avg_rating')
    list_filter = ('status', 'language', 'certificate')
    search_fields = ('title',)
    inlines = [CastInline]


class ScreenInline(admin.TabularInline):
    model = Screen
    extra = 0
    show_change_link = True


@admin.register(Theatre)
class TheatreAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'is_active')
    list_filter = ('city', 'is_active')
    search_fields = ('name', 'address')
    inlines = [ScreenInline]


@admin.register(Screen)
class ScreenAdmin(admin.ModelAdmin):
    list_display = ('name', 'theatre', 'total_rows', 'total_cols')
    list_filter = ('theatre__city',)
    search_fields = ('name', 'theatre__name')


@admin.register(SeatTemplate)
class SeatTemplateAdmin(admin.ModelAdmin):
    list_display = ('screen', 'row_label', 'number', 'tier', 'is_aisle', 'is_blocked')
    list_filter = ('tier', 'is_aisle', 'is_blocked', 'screen')
    search_fields = ('row_label', 'screen__name')


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('movie', 'user', 'rating', 'created_at')
    list_filter = ('rating',)
    search_fields = ('movie__title', 'user__email', 'text')
