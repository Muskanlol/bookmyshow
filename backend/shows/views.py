from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from config.mixins import ProtectedDestroyMixin

from .filters import ShowFilter
from .models import Show
from .serializers import (
    BulkShowSerializer,
    ShowCreateSerializer,
    ShowReadSerializer,
    ShowUpdateSerializer,
)
from .services import ShowError, bulk_create_shows


class ShowViewSet(ProtectedDestroyMixin, viewsets.ModelViewSet):
    filterset_class = ShowFilter
    search_fields = ('movie__title', 'screen__name', 'screen__theatre__name')
    ordering_fields = ('start_time', 'id', 'status')

    def get_queryset(self):
        return (
            Show.objects.select_related('movie', 'screen__theatre__city')
            .prefetch_related('tier_prices')
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return ShowCreateSerializer
        if self.action in ('update', 'partial_update'):
            return ShowUpdateSerializer
        if self.action == 'bulk_create':
            return BulkShowSerializer
        return ShowReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = ShowCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            show = serializer.save()
        except ShowError as exc:
            return Response(
                {'detail': exc.detail, 'conflicts': exc.conflicts},
                status=status.HTTP_400_BAD_REQUEST,
            )
        show = self.get_queryset().get(pk=show.pk)
        return Response(ShowReadSerializer(show).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        show = self.get_object()
        serializer = ShowUpdateSerializer(show, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            show = serializer.save()
        except ShowError as exc:
            return Response(
                {'detail': exc.detail, 'conflicts': exc.conflicts},
                status=status.HTTP_400_BAD_REQUEST,
            )
        show = self.get_queryset().get(pk=show.pk)
        return Response(ShowReadSerializer(show).data)

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        serializer = BulkShowSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            shows = bulk_create_shows(
                movie=data['movie'],
                screens=data['screens'],
                date_from=data['date_from'],
                date_to=data['date_to'],
                time_slots=data['time_slots'],
                tier_prices=data['tier_prices'],
            )
        except ShowError as exc:
            return Response(
                {'detail': exc.detail, 'conflicts': exc.conflicts},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                'created': len(shows),
                'shows': [
                    {
                        'id': show.id,
                        'screen': show.screen_id,
                        'start_time': show.start_time,
                        'end_time': show.end_time,
                    }
                    for show in shows
                ],
            },
            status=status.HTTP_201_CREATED,
        )
