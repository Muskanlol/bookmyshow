from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from config.testing import make_confirmed_booking, make_show, staff_client


class ReportTests(TestCase):
    def setUp(self):
        self.client, _user = staff_client()
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='pass12345',
            name='Asha Iyer',
            phone='9876543210',
        )
        self.show = make_show(start=timezone.now())
        self.booking = make_confirmed_booking(self.show, self.customer)

    def test_summary_revenue_occupancy_and_csv(self):
        summary = self.client.get('/api/v1/admin/reports/summary/')
        self.assertEqual(summary.status_code, 200)
        self.assertGreaterEqual(summary.data['bookings_today'], 1)
        self.assertGreater(float(summary.data['revenue_today']), 0)
        self.assertGreaterEqual(summary.data['tickets_today'], 2)
        self.assertEqual(summary.data['top_movies'][0]['title'], 'Midnight Local')

        for group in ('movie', 'theatre', 'date'):
            revenue = self.client.get('/api/v1/admin/reports/revenue/', {'group_by': group})
            self.assertEqual(revenue.status_code, 200, revenue.data)
            self.assertGreaterEqual(len(revenue.data['results']), 1)

        rejected = self.client.get('/api/v1/admin/reports/revenue/', {'group_by': 'week'})
        self.assertEqual(rejected.status_code, 400)

        occupancy = self.client.get('/api/v1/admin/reports/occupancy/', {
            'theatre': self.show.screen.theatre_id,
        })
        self.assertEqual(occupancy.status_code, 200)
        self.assertGreaterEqual(occupancy.data['booked'], 2)

        exported = self.client.get('/api/v1/admin/reports/export.csv')
        self.assertEqual(exported.status_code, 200)
        body = exported.content.decode()
        self.assertIn('booking_id', body)
        self.assertIn('Midnight Local', body)
        self.assertIn(str(self.booking.id), body)
