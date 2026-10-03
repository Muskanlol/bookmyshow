from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import BookedSeat, SeatHold
from catalog.customer_views import poster_url

from .models import Show


class ShowSeatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        show = get_object_or_404(
            Show.objects.select_related('movie', 'screen__theatre__city').prefetch_related(
                'tier_prices',
                'screen__seats',
            ),
            pk=pk,
        )
        now = timezone.now()
        booked = set(
            BookedSeat.objects.filter(show=show, is_active=True, seat_id__isnull=False)
            .values_list('seat_id', flat=True)
        )
        held_by = {
            row.seat_id: row.user_id
            for row in SeatHold.objects.filter(show=show, expires_at__gt=now)
        }
        user_id = request.user.id if request.user.is_authenticated else None
        prices = {row.tier: row.price for row in show.tier_prices.all()}
        seats = []
        for seat in show.screen.seats.all():
            if seat.is_aisle:
                status = 'aisle'
            elif seat.is_blocked:
                status = 'blocked'
            elif seat.id in booked:
                status = 'booked'
            elif seat.id in held_by:
                status = 'mine' if held_by[seat.id] == user_id else 'held'
            else:
                status = 'available'
            seats.append({
                'id': seat.id,
                'row_index': seat.row_index,
                'col_index': seat.col_index,
                'row_label': seat.row_label,
                'number': seat.number,
                'label': seat.label,
                'tier': seat.tier,
                'status': status,
                'price': None if seat.is_aisle else prices.get(seat.tier),
            })
        movie = show.movie
        theatre = show.screen.theatre
        return Response({
            'show': {
                'id': show.id,
                'start_time': show.start_time,
                'end_time': show.end_time,
                'status': show.status,
                'movie': {
                    'id': movie.id,
                    'title': movie.title,
                    'language': movie.language,
                    'certificate': movie.certificate,
                    'duration_min': movie.duration_min,
                    'poster': poster_url(movie, request),
                },
                'theatre': {
                    'id': theatre.id,
                    'name': theatre.name,
                    'address': theatre.address,
                    'city': theatre.city.name,
                },
                'screen': {
                    'id': show.screen.id,
                    'name': show.screen.name,
                    'total_rows': show.screen.total_rows,
                    'total_cols': show.screen.total_cols,
                },
                'prices': [
                    {'tier': row.tier, 'price': row.price}
                    for row in sorted(show.tier_prices.all(), key=lambda row: -row.price)
                ],
            },
            'seats': seats,
        })
