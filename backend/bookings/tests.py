from datetime import timedelta

from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from bookings.models import BookedSeat, Booking, Payment, SeatHold
from bookings.services import cancel_booking, purge_expired_holds
from config.testing import make_confirmed_booking, make_show, staff_client
from shows.models import Show


class BookingTests(TestCase):
    def setUp(self):
        self.client, self.staff = staff_client()
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='pass12345',
            name='Asha Iyer',
            phone='9876543210',
        )
        self.show = make_show(start=timezone.now() + timedelta(hours=2))
        self.booking = make_confirmed_booking(self.show, self.customer)

    def test_active_seat_cannot_be_double_booked_until_cancel(self):
        seat = self.booking.booked_seats.filter(is_active=True).order_by('id').first()
        other = Booking.objects.create(
            user=self.staff,
            show=self.show,
            status=Booking.Status.CONFIRMED,
            subtotal=seat.price,
            fee=0,
            discount=0,
            total=seat.price,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                BookedSeat.objects.create(
                    booking=other,
                    show=self.show,
                    seat=seat.seat,
                    seat_label=seat.seat_label,
                    price=seat.price,
                    is_active=True,
                )

        response = self.client.post(f'/api/v1/admin/bookings/{self.booking.id}/cancel/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'cancelled')
        self.assertFalse(response.data['seats'][0]['is_active'])
        self.assertEqual(response.data['payments'][0]['status'], 'refunded')

        BookedSeat.objects.create(
            booking=other,
            show=self.show,
            seat=seat.seat,
            seat_label=seat.seat_label,
            price=seat.price,
            is_active=True,
        )
        again = self.client.post(f'/api/v1/admin/bookings/{self.booking.id}/cancel/')
        self.assertEqual(again.status_code, 400)

    def test_search_by_phone_and_show_date(self):
        show_day = timezone.localtime(self.show.start_time).date().isoformat()
        response = self.client.get('/api/v1/admin/bookings/', {
            'search': '9876543210',
            'date': show_day,
            'status': 'confirmed',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.booking.id)

        by_id = self.client.get('/api/v1/admin/bookings/', {'search': str(self.booking.id)})
        self.assertEqual(by_id.data['count'], 1)

    def test_purge_expires_pending_bookings_and_old_holds(self):
        seat = self.show.screen.seats.filter(is_aisle=False).exclude(
            id__in=self.booking.booked_seats.values_list('seat_id', flat=True),
        ).first()
        past = timezone.now() - timedelta(minutes=5)
        pending = Booking.objects.create(
            user=self.customer,
            show=self.show,
            status=Booking.Status.PENDING,
            subtotal=0,
            fee=0,
            discount=0,
            total=0,
            expires_at=past,
        )
        hold = SeatHold.objects.create(
            show=self.show,
            seat=seat,
            user=self.customer,
            booking=pending,
            expires_at=past,
        )
        future_seat = self.show.screen.seats.filter(is_aisle=False).exclude(
            id__in=[seat.id, *self.booking.booked_seats.values_list('seat_id', flat=True)],
        ).first()
        kept = SeatHold.objects.create(
            show=self.show,
            seat=future_seat,
            user=self.customer,
            booking=None,
            expires_at=timezone.now() + timedelta(minutes=8),
        )

        holds, bookings = purge_expired_holds()
        self.assertGreaterEqual(holds, 1)
        self.assertGreaterEqual(bookings, 1)
        self.assertFalse(SeatHold.objects.filter(pk=hold.pk).exists())
        self.assertTrue(SeatHold.objects.filter(pk=kept.pk).exists())
        pending.refresh_from_db()
        self.assertEqual(pending.status, Booking.Status.EXPIRED)
        self.booking.refresh_from_db()
        self.assertEqual(self.booking.status, Booking.Status.CONFIRMED)


class CancelServiceTests(TestCase):
    def test_cancel_releases_the_seat_inside_the_service(self):
        customer = User.objects.create_user(
            email='buyer@example.com',
            password='pass12345',
            name='Buyer',
            phone='9000000000',
        )
        show = make_show()
        booking = make_confirmed_booking(show, customer, seat_count=1)
        payment = Payment.objects.get(booking=booking)
        cancel_booking(booking.pk)
        booking.refresh_from_db()
        payment.refresh_from_db()
        self.assertEqual(booking.status, Booking.Status.CANCELLED)
        self.assertIsNotNone(booking.cancelled_at)
        self.assertEqual(payment.status, Payment.Status.REFUNDED)
        self.assertFalse(booking.booked_seats.filter(is_active=True).exists())
        self.assertEqual(Show.objects.count(), 1)
