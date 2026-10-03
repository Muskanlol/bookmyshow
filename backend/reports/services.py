from django.db.models import Count, IntegerField, OuterRef, Subquery, Sum
from django.db.models.functions import Coalesce, TruncDate

from bookings.models import BookedSeat, Booking, Payment
from catalog.models import SeatTemplate
from config.utils import IST, local_day_bounds
from shows.models import Show


def _percent(booked, bookable):
    if not bookable:
        return 0
    return round(booked * 100 / bookable, 2)


def occupancy(day, theatre_id=None):
    start, end = local_day_bounds(day)
    bookable_sq = (
        SeatTemplate.objects.filter(
            screen_id=OuterRef('screen_id'),
            is_aisle=False,
            is_blocked=False,
        )
        .values('screen_id')
        .annotate(total=Count('id'))
        .values('total')
    )
    booked_sq = (
        BookedSeat.objects.filter(show_id=OuterRef('pk'), is_active=True)
        .values('show_id')
        .annotate(total=Count('id'))
        .values('total')
    )
    shows = Show.objects.filter(start_time__gte=start, start_time__lt=end).exclude(
        status=Show.Status.CANCELLED,
    )
    if theatre_id:
        shows = shows.filter(screen__theatre_id=theatre_id)
    shows = (
        shows.select_related('movie', 'screen__theatre__city')
        .annotate(
            bookable=Coalesce(Subquery(bookable_sq, output_field=IntegerField()), 0),
            booked=Coalesce(Subquery(booked_sq, output_field=IntegerField()), 0),
        )
        .order_by('start_time')
    )
    results = []
    total_booked = 0
    total_bookable = 0
    for show in shows:
        total_booked += show.booked
        total_bookable += show.bookable
        results.append({
            'show_id': show.id,
            'movie': show.movie.title,
            'theatre': show.screen.theatre.name,
            'screen': show.screen.name,
            'city': show.screen.theatre.city.name,
            'start_time': show.start_time,
            'bookable': show.bookable,
            'booked': show.booked,
            'occupancy_percent': _percent(show.booked, show.bookable),
        })
    return {
        'results': results,
        'occupancy_percent': _percent(total_booked, total_bookable),
        'booked': total_booked,
        'bookable': total_bookable,
    }


def summary(day):
    start, end = local_day_bounds(day)
    confirmed = Booking.objects.filter(
        status=Booking.Status.CONFIRMED,
        created_at__gte=start,
        created_at__lt=end,
    )
    revenue = Payment.objects.filter(
        status=Payment.Status.SUCCESS,
        paid_at__gte=start,
        paid_at__lt=end,
    ).aggregate(total=Sum('amount'))['total'] or 0
    cancellations = Booking.objects.filter(
        status=Booking.Status.CANCELLED,
        cancelled_at__gte=start,
        cancelled_at__lt=end,
    ).count()
    top_movies = list(
        BookedSeat.objects.filter(
            is_active=True,
            booking__status=Booking.Status.CONFIRMED,
            show__start_time__gte=start,
            show__start_time__lt=end,
        )
        .values('show__movie_id', 'show__movie__title')
        .annotate(tickets=Count('id'), ticket_revenue=Sum('price'))
        .order_by('-tickets', 'show__movie__title')[:5]
    )
    per_city = list(
        confirmed.values('show__screen__theatre__city__name')
        .annotate(bookings=Count('id'))
        .order_by('show__screen__theatre__city__name')
    )
    seats = occupancy(day)
    return {
        'date': day,
        'bookings_today': confirmed.count(),
        'revenue_today': revenue,
        'cancellations_today': cancellations,
        'occupancy_percent': seats['occupancy_percent'],
        'shows_today': len(seats['results']),
        'tickets_today': seats['booked'],
        'top_movies': [
            {
                'movie_id': row['show__movie_id'],
                'title': row['show__movie__title'],
                'tickets': row['tickets'],
                'ticket_revenue': row['ticket_revenue'],
            }
            for row in top_movies
        ],
        'bookings_per_city': [
            {
                'city': row['show__screen__theatre__city__name'],
                'bookings': row['bookings'],
            }
            for row in per_city
        ],
    }


def _payments(date_from, date_to):
    queryset = Payment.objects.filter(status=Payment.Status.SUCCESS, paid_at__isnull=False)
    if date_from:
        start, _ = local_day_bounds(date_from)
        queryset = queryset.filter(paid_at__gte=start)
    if date_to:
        _, end = local_day_bounds(date_to)
        queryset = queryset.filter(paid_at__lt=end)
    return queryset


def revenue(group_by, date_from=None, date_to=None):
    queryset = _payments(date_from, date_to)
    if group_by == 'movie':
        rows = (
            queryset.values('booking__show__movie_id', 'booking__show__movie__title')
            .annotate(revenue=Sum('amount'), bookings=Count('booking', distinct=True))
            .order_by('-revenue')
        )
        results = [
            {
                'movie_id': row['booking__show__movie_id'],
                'name': row['booking__show__movie__title'],
                'revenue': row['revenue'],
                'bookings': row['bookings'],
            }
            for row in rows
        ]
    elif group_by == 'theatre':
        rows = (
            queryset.values(
                'booking__show__screen__theatre_id',
                'booking__show__screen__theatre__name',
                'booking__show__screen__theatre__city__name',
            )
            .annotate(revenue=Sum('amount'), bookings=Count('booking', distinct=True))
            .order_by('-revenue')
        )
        results = [
            {
                'theatre_id': row['booking__show__screen__theatre_id'],
                'name': row['booking__show__screen__theatre__name'],
                'city': row['booking__show__screen__theatre__city__name'],
                'revenue': row['revenue'],
                'bookings': row['bookings'],
            }
            for row in rows
        ]
    else:
        rows = (
            queryset.annotate(day=TruncDate('paid_at', tzinfo=IST))
            .values('day')
            .annotate(revenue=Sum('amount'), bookings=Count('booking', distinct=True))
            .order_by('day')
        )
        results = [
            {'date': row['day'], 'revenue': row['revenue'], 'bookings': row['bookings']}
            for row in rows
        ]
    return results


def export_rows(date_from=None, date_to=None):
    payments = (
        _payments(date_from, date_to)
        .select_related(
            'booking__user',
            'booking__show__movie',
            'booking__show__screen__theatre__city',
        )
        .order_by('paid_at')
    )
    rows = []
    for payment in payments:
        booking = payment.booking
        show = booking.show
        rows.append({
            'booking_id': booking.id,
            'paid_at': payment.paid_at.isoformat(),
            'movie': show.movie.title,
            'theatre': show.screen.theatre.name,
            'city': show.screen.theatre.city.name,
            'customer': booking.user.name,
            'amount': f'{payment.amount:.2f}',
            'status': payment.status,
        })
    return rows
