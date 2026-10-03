from django.test import TestCase

from config.testing import staff_client


class CouponTests(TestCase):
    def setUp(self):
        self.client, _user = staff_client()

    def test_code_is_uppercased_and_percent_cannot_exceed_100(self):
        rejected = self.client.post(
            '/api/v1/admin/coupons/',
            {
                'code': 'take10',
                'type': 'percent',
                'value': '150.00',
                'valid_from': '2026-10-01T00:00:00Z',
                'valid_to': '2026-11-01T00:00:00Z',
                'max_uses': 10,
            },
            format='json',
        )
        self.assertEqual(rejected.status_code, 400)

        created = self.client.post(
            '/api/v1/admin/coupons/',
            {
                'code': 'take10',
                'type': 'percent',
                'value': '10.00',
                'valid_from': '2026-10-01T00:00:00Z',
                'valid_to': '2026-11-01T00:00:00Z',
                'max_uses': 10,
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['code'], 'TAKE10')
        self.assertEqual(created.data['used_count'], 0)
