from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import User
from bookings.models import BookedSeat, Booking
from catalog.models import Movie
from config.testing import make_show, staff_user
from offers.models import Coupon
from shows.models import Show


def customer(email='asha@example.com'):
    return User.objects.create_user(
        email=email,
        password='Customer@12345',
        name='Asha Iyer',
        phone='9000000001' if email.startswith('asha') else '',
        role=User.Role.CUSTOMER,
    )


def auth(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


class CustomerBookingTests(TestCase):
    def setUp(self):
        self.show = make_show()
        self.user = customer()
        self.client = auth(self.user)
        now = timezone.now()
        Coupon.objects.create(
            code='TAKE10',
            type=Coupon.Type.PERCENT,
            value=Decimal('10.00'),
            valid_from=now - timedelta(days=1),
            valid_to=now + timedelta(days=2),
            max_uses=5,
        )

    def seat_ids(self, count=2):
        return list(
            self.show.screen.seats.filter(is_aisle=False).order_by('id').values_list('id', flat=True)[:count]
        )

    def test_anonymous_can_read_the_seat_map(self):
        response = APIClient().get(f'/api/v1/shows/{self.show.id}/seats/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['seats']), 8)
        self.assertTrue(all(seat['status'] == 'available' for seat in response.data['seats']))

    def test_hold_prices_on_the_server_and_pay_applies_coupon(self):
        seats = self.seat_ids()
        held = self.client.post('/api/v1/bookings/hold/', {'show': self.show.id, 'seat_ids': seats}, format='json')
        self.assertEqual(held.status_code, 201, held.data)
        self.assertEqual(held.data['subtotal'], Decimal('400.00'))
        self.assertEqual(held.data['fee'], Decimal('20.00'))
        self.assertEqual(held.data['total'], Decimal('420.00'))
        self.assertEqual(len(held.data['seats']), 2)

        other = auth(customer('ravi@example.com'))
        clash = other.post('/api/v1/bookings/hold/', {'show': self.show.id, 'seat_ids': seats[:1]}, format='json')
        self.assertEqual(clash.status_code, 400)

        quoted = self.client.post(
            f'/api/v1/bookings/{held.data["id"]}/quote/',
            {'coupon_code': 'take10'},
            format='json',
        )
        self.assertEqual(quoted.status_code, 200, quoted.data)
        self.assertEqual(quoted.data['discount'], Decimal('40.00'))
        self.assertEqual(quoted.data['total'], Decimal('380.00'))

        paid = self.client.post(
            f'/api/v1/bookings/{held.data["id"]}/pay/',
            {'coupon_code': 'TAKE10'},
            format='json',
        )
        self.assertEqual(paid.status_code, 200, paid.data)
        self.assertEqual(paid.data['status'], 'confirmed')
        self.assertEqual(paid.data['total'], Decimal('380.00'))
        self.assertEqual(BookedSeat.objects.filter(booking_id=held.data['id'], is_active=True).count(), 2)
        self.assertEqual(Coupon.objects.get(code='TAKE10').used_count, 1)

        seat_map = APIClient().get(f'/api/v1/shows/{self.show.id}/seats/')
        booked = [seat for seat in seat_map.data['seats'] if seat['status'] == 'booked']
        self.assertEqual(len(booked), 2)

    def test_second_pay_is_rejected(self):
        held = self.client.post(
            '/api/v1/bookings/hold/',
            {'show': self.show.id, 'seat_ids': self.seat_ids(1)},
            format='json',
        )
        paid = self.client.post(f'/api/v1/bookings/{held.data["id"]}/pay/', {}, format='json')
        self.assertEqual(paid.status_code, 200)
        again = self.client.post(f'/api/v1/bookings/{held.data["id"]}/pay/', {}, format='json')
        self.assertEqual(again.status_code, 400)
        self.assertEqual(Booking.objects.get(pk=held.data['id']).status, Booking.Status.CONFIRMED)

    def test_customer_sees_only_their_bookings(self):
        self.client.post(
            '/api/v1/bookings/hold/',
            {'show': self.show.id, 'seat_ids': self.seat_ids(1)},
            format='json',
        )
        other = auth(customer('ravi@example.com'))
        listing = other.get('/api/v1/bookings/')
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data, [])

    def test_showtimes_are_public_and_grouped(self):
        city_id = self.show.screen.theatre.city_id
        day = timezone.localtime(self.show.start_time).date().isoformat()
        response = APIClient().get(f'/api/v1/movies/{self.show.movie_id}/shows/?city={city_id}&date={day}')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data['theatres']), 1)
        self.assertEqual(response.data['theatres'][0]['shows'][0]['id'], self.show.id)

    def test_staff_cannot_use_the_customer_login(self):
        staff_user(email='staff@example.com', password='pass12345')
        response = APIClient().post(
            '/api/v1/auth/login/',
            {'email': 'staff@example.com', 'password': 'pass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_register_and_login(self):
        created = APIClient().post(
            '/api/v1/auth/register/',
            {
                'name': 'Neel Kapoor',
                'email': 'neel@example.com',
                'phone': '9111111111',
                'password': 'Customer@12345',
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertIn('access', created.data)
        self.assertEqual(created.data['user']['role'], 'customer')
        signed = APIClient().post(
            '/api/v1/auth/login/',
            {'email': 'neel@example.com', 'password': 'Customer@12345'},
            format='json',
        )
        self.assertEqual(signed.status_code, 200)

    def test_coming_soon_is_listed_and_ended_is_hidden(self):
        Movie.objects.create(
            title='Ended Film',
            description='Done.',
            duration_min=90,
            language='Hindi',
            genre='Drama',
            certificate=Movie.Certificate.U,
            release_date=timezone.localdate(),
            status=Movie.Status.ENDED,
        )
        response = APIClient().get('/api/v1/movies/')
        titles = [row['title'] for row in response.data]
        self.assertIn(self.show.movie.title, titles)
        self.assertNotIn('Ended Film', titles)
        self.assertEqual(Show.objects.filter(pk=self.show.pk).count(), 1)
