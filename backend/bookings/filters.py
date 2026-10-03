import django_filters
from django.db.models import Q

from config.utils import local_day_bounds

from .models import Booking


class BookingFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search')
    status = django_filters.CharFilter(field_name='status')
    date = django_filters.DateFilter(method='filter_show_date')
    show = django_filters.NumberFilter(field_name='show_id')

    class Meta:
        model = Booking
        fields = ('search', 'status', 'date', 'show')

    def filter_search(self, queryset, name, value):
        query = (
            Q(user__name__icontains=value)
            | Q(user__phone__icontains=value)
            | Q(user__email__icontains=value)
        )
        if str(value).isdigit():
            query |= Q(pk=int(value))
        return queryset.filter(query)

    def filter_show_date(self, queryset, name, value):
        start, end = local_day_bounds(value)
        return queryset.filter(show__start_time__gte=start, show__start_time__lt=end)
