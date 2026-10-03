import django_filters

from config.utils import local_day_bounds

from .models import Show


class ShowFilter(django_filters.FilterSet):
    date = django_filters.DateFilter(method='filter_local_date')
    theatre = django_filters.NumberFilter(field_name='screen__theatre_id')
    movie = django_filters.NumberFilter(field_name='movie_id')
    status = django_filters.CharFilter(field_name='status')

    class Meta:
        model = Show
        fields = ('date', 'theatre', 'movie', 'status')

    def filter_local_date(self, queryset, name, value):
        start, end = local_day_bounds(value)
        return queryset.filter(start_time__gte=start, start_time__lt=end)
