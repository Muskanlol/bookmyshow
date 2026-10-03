from rest_framework import serializers

from .models import BookedSeat, Booking, Payment


class BookedSeatSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookedSeat
        fields = ('id', 'seat', 'seat_label', 'price', 'is_active')


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ('id', 'provider', 'provider_ref', 'amount', 'status', 'paid_at')


class BookingSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    movie_title = serializers.CharField(source='show.movie.title', read_only=True)
    theatre_name = serializers.CharField(source='show.screen.theatre.name', read_only=True)
    screen_name = serializers.CharField(source='show.screen.name', read_only=True)
    city_name = serializers.CharField(source='show.screen.theatre.city.name', read_only=True)
    start_time = serializers.DateTimeField(source='show.start_time', read_only=True)
    seats = BookedSeatSerializer(source='booked_seats', many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Booking
        fields = (
            'id',
            'status',
            'subtotal',
            'fee',
            'discount',
            'total',
            'created_at',
            'updated_at',
            'expires_at',
            'cancelled_at',
            'user',
            'user_name',
            'user_email',
            'user_phone',
            'show',
            'movie_title',
            'theatre_name',
            'screen_name',
            'city_name',
            'start_time',
            'seats',
            'payments',
        )
