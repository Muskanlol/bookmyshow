import django_filters

from .models import Movie


class MovieFilter(django_filters.FilterSet):
    language = django_filters.CharFilter(field_name='language', lookup_expr='iexact')
    genre = django_filters.CharFilter(field_name='genre', lookup_expr='iexact')

    class Meta:
        model = Movie
        fields = ('status', 'language', 'genre', 'certificate')
