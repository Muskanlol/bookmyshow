from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from config.mixins import ProtectedDestroyMixin

from .filters import MovieFilter
from .models import City, Movie, Screen, Theatre
from .serializers import (
    CitySerializer,
    GenerateSeatsSerializer,
    MovieSerializer,
    ScreenListSerializer,
    ScreenSerializer,
    SeatPatchSerializer,
    TheatreSerializer,
)
from .services import LayoutError, generate_seats, update_seats


class CityViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    search_fields = ('name', 'state')
    ordering_fields = ('name', 'state', 'id')


class MovieViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    queryset = Movie.objects.prefetch_related('cast_members').all()
    serializer_class = MovieSerializer
    filterset_class = MovieFilter
    search_fields = ('title', 'language', 'genre')
    ordering_fields = ('title', 'release_date', 'avg_rating', 'id')


class TheatreViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    queryset = Theatre.objects.select_related('city').prefetch_related('screens').all()
    serializer_class = TheatreSerializer
    filterset_fields = ('city', 'is_active')
    search_fields = ('name', 'address', 'city__name')
    ordering_fields = ('name', 'id')


class ScreenViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    serializer_class = ScreenSerializer
    filterset_fields = ('theatre',)
    search_fields = ('name', 'theatre__name')
    ordering_fields = ('name', 'id')

    def get_queryset(self):
        return (
            Screen.objects.select_related('theatre__city')
            .annotate(seat_count=Count('seats', distinct=True))
            .prefetch_related('seats')
            .order_by('name', 'id')
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ScreenListSerializer
        return ScreenSerializer

    @action(detail=True, methods=['post'], url_path='generate-seats')
    def generate(self, request, pk=None):
        screen = self.get_object()
        serializer = GenerateSeatsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            screen = generate_seats(screen=screen, **serializer.validated_data)
        except LayoutError as exc:
            return Response({'detail': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        screen = self.get_queryset().get(pk=screen.pk)
        return Response(ScreenSerializer(screen).data)

    @action(detail=True, methods=['patch'], url_path='seats')
    def seats(self, request, pk=None):
        screen = self.get_object()
        serializer = SeatPatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            screen = update_seats(screen, serializer.validated_data['seats'])
        except LayoutError as exc:
            return Response({'detail': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        screen = self.get_queryset().get(pk=screen.pk)
        return Response(ScreenSerializer(screen).data)
