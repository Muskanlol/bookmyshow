from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from accounts.serializers import UserSerializer

from .customer_services import (
    BookingError,
    cancel_customer_booking,
    hold_seats,
    pay_booking,
    quote_booking,
)
from .models import Booking
from .serializers import PaymentSerializer


def booking_payload(booking, request):
    show = booking.show
    movie = show.movie
    theatre = show.screen.theatre
    poster = None
    if movie.poster:
        poster = request.build_absolute_uri(movie.poster.url)
    if booking.status == Booking.Status.PENDING:
        from .customer_services import show_prices

        prices = show_prices(show)
        seats = [
            {
                'seat': hold.seat_id,
                'seat_label': hold.seat.label,
                'tier': hold.seat.tier,
                'price': prices.get(hold.seat.tier),
            }
            for hold in booking.holds.select_related('seat').order_by('seat__row_index', 'seat__col_index')
        ]
    else:
        seats = [
            {
                'seat': row.seat_id,
                'seat_label': row.seat_label,
                'tier': row.seat.tier if row.seat_id else '',
                'price': row.price,
            }
            for row in booking.booked_seats.select_related('seat').order_by('id')
        ]
    return {
        'id': booking.id,
        'status': booking.status,
        'subtotal': booking.subtotal,
        'fee': booking.fee,
        'discount': booking.discount,
        'total': booking.total,
        'created_at': booking.created_at,
        'expires_at': booking.expires_at,
        'cancelled_at': booking.cancelled_at,
        'show': show.id,
        'movie_id': movie.id,
        'movie_title': movie.title,
        'language': movie.language,
        'certificate': movie.certificate,
        'duration_min': movie.duration_min,
        'poster': poster,
        'theatre_name': theatre.name,
        'screen_name': show.screen.name,
        'city_name': theatre.city.name,
        'start_time': show.start_time,
        'seats': seats,
        'payments': PaymentSerializer(booking.payments.all(), many=True).data,
        'user': UserSerializer(booking.user).data,
    }


def owned_booking(user, pk):
    return (
        Booking.objects.select_related(
            'show__movie',
            'show__screen__theatre__city',
            'user',
        )
        .prefetch_related('holds__seat', 'booked_seats__seat', 'payments', 'show__tier_prices')
        .get(pk=pk, user=user)
    )


class HoldSerializer(serializers.Serializer):
    show = serializers.IntegerField()
    seat_ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)


class CouponSerializer(serializers.Serializer):
    coupon_code = serializers.CharField(required=False, allow_blank=True, default='')


class CustomerBookingView(APIView):
    permission_classes = [IsCustomer]


class HoldSeatsView(CustomerBookingView):
    def post(self, request):
        serializer = HoldSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            booking = hold_seats(
                request.user,
                serializer.validated_data['show'],
                serializer.validated_data['seat_ids'],
            )
        except BookingError as exc:
            return Response({'detail': exc.detail}, status=400)
        booking = owned_booking(request.user, booking.id)
        return Response(booking_payload(booking, request), status=201)


class BookingListView(CustomerBookingView):
    def get(self, request):
        bookings = (
            Booking.objects.filter(user=request.user)
            .select_related('show__movie', 'show__screen__theatre__city', 'user')
            .prefetch_related('holds__seat', 'booked_seats__seat', 'payments', 'show__tier_prices')
            .order_by('-created_at')
        )
        return Response([booking_payload(booking, request) for booking in bookings[:50]])


class BookingDetailView(CustomerBookingView):
    def get(self, request, pk):
        try:
            booking = owned_booking(request.user, pk)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=404)
        return Response(booking_payload(booking, request))


class QuoteBookingView(CustomerBookingView):
    def post(self, request, pk):
        serializer = CouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            quote_booking(request.user, pk, serializer.validated_data.get('coupon_code', ''))
            booking = owned_booking(request.user, pk)
        except BookingError as exc:
            return Response({'detail': exc.detail}, status=400)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=404)
        return Response(booking_payload(booking, request))


class PayBookingView(CustomerBookingView):
    def post(self, request, pk):
        serializer = CouponSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            pay_booking(request.user, pk, serializer.validated_data.get('coupon_code', ''))
            booking = owned_booking(request.user, pk)
        except BookingError as exc:
            return Response({'detail': exc.detail}, status=400)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=404)
        return Response(booking_payload(booking, request))


class CancelBookingView(CustomerBookingView):
    def post(self, request, pk):
        try:
            cancel_customer_booking(request.user, pk)
            booking = owned_booking(request.user, pk)
        except BookingError as exc:
            return Response({'detail': exc.detail}, status=400)
        except Booking.DoesNotExist:
            return Response({'detail': 'Booking not found.'}, status=404)
        return Response(booking_payload(booking, request))
