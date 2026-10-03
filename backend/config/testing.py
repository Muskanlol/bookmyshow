from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from bookings.models import BookedSeat, Booking, Payment
from catalog.models import City, Movie, Screen, Theatre
from catalog.services import generate_seats
from shows.services import create_show


def staff_user(**overrides):
    data = {
        'email': 'staff@example.com',
        'password': 'pass12345',
        'name': 'Staff User',
        'role': User.Role.ADMIN,
        'is_staff': True,
        'is_superuser': True,
    }
    data.update(overrides)
    password = data.pop('password')
    return User.objects.create_user(password=password, **data)


def staff_client(**overrides):
    user = staff_user(**overrides)
    client = APIClient()
    client.force_authenticate(user=user)
    return client, user


def make_movie(**overrides):
    data = {
        'title': 'Midnight Local',
        'description': 'A night train that never reaches the last station.',
        'duration_min': 120,
        'language': 'Hindi',
        'genre': 'Drama',
        'certificate': Movie.Certificate.UA,
        'release_date': timezone.localdate(),
        'status': Movie.Status.NOW_SHOWING,
    }
    data.update(overrides)
    return Movie.objects.create(**data)


def make_screen(**overrides):
    suffix = City.objects.count() + Screen.objects.count() + 1
    city = City.objects.create(name=f'City {suffix}', state='Maharashtra')
    theatre = Theatre.objects.create(
        city=city,
        name=f'Galaxy {suffix}',
        address='1 Link Road',
        amenities=['Parking'],
    )
    screen = Screen.objects.create(theatre=theatre, name='Screen 1', **overrides)
    generate_seats(
        screen,
        rows=2,
        cols=4,
        row_tiers=[{'from_row': 1, 'to_row': 2, 'tier': 'gold'}],
        aisle_columns=[],
    )
    return Screen.objects.get(pk=screen.pk)


def make_show(screen=None, movie=None, start=None, prices=None):
    screen = screen or make_screen()
    movie = movie or make_movie()
    start = start or (timezone.now() + timedelta(hours=3))
    tier_prices = prices or [{'tier': 'gold', 'price': Decimal('200.00')}]
    return create_show(
        movie=movie,
        screen=screen,
        start_time=start,
        tier_prices=tier_prices,
    )


def make_confirmed_booking(show, user, seat_count=2):
    seats = list(
        show.screen.seats.filter(is_aisle=False, is_blocked=False).order_by('row_index', 'col_index')[:seat_count]
    )
    prices = {row.tier: row.price for row in show.tier_prices.all()}
    subtotal = sum((prices[seat.tier] for seat in seats), Decimal('0.00'))
    fee = settings.CONVENIENCE_FEE
    booking = Booking.objects.create(
        user=user,
        show=show,
        status=Booking.Status.CONFIRMED,
        subtotal=subtotal,
        fee=fee,
        discount=Decimal('0.00'),
        total=subtotal + fee,
    )
    BookedSeat.objects.bulk_create([
        BookedSeat(
            booking=booking,
            show=show,
            seat=seat,
            seat_label=seat.label,
            price=prices[seat.tier],
            is_active=True,
        )
        for seat in seats
    ])
    Payment.objects.create(
        booking=booking,
        provider='mock',
        provider_ref=f'mock-{booking.id}',
        amount=booking.total,
        status=Payment.Status.SUCCESS,
        paid_at=timezone.now(),
    )
    return booking
