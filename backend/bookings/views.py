from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .filters import BookingFilter
from .models import Booking
from .serializers import BookingSerializer
from .services import BookingError, cancel_booking


class BookingViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = BookingSerializer
    filterset_class = BookingFilter
    ordering_fields = ('created_at', 'total', 'id', 'status')

    def get_queryset(self):
        return (
            Booking.objects.select_related(
                'user',
                'show__movie',
                'show__screen__theatre__city',
            )
            .prefetch_related('booked_seats', 'payments')
        )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        try:
            cancel_booking(booking.pk)
        except BookingError as exc:
            return Response({'detail': exc.detail}, status=status.HTTP_400_BAD_REQUEST)
        booking = self.get_queryset().get(pk=booking.pk)
        return Response(BookingSerializer(booking).data)
