from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from rest_framework.test import APIClient

User = get_user_model()


class AdminAuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email='staff@example.com',
            password='pass12345',
            name='Staff User',
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.customer = User.objects.create_user(
            email='customer@example.com',
            password='pass12345',
            name='Customer User',
            role=User.Role.CUSTOMER,
        )

    def test_staff_can_log_in_and_read_profile(self):
        response = self.client.post(
            '/api/v1/admin/auth/login/',
            {'email': 'staff@example.com', 'password': 'pass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('access', response.data)
        self.assertEqual(response.data['user']['email'], 'staff@example.com')

        me = self.client.get(
            '/api/v1/admin/auth/me/',
            HTTP_AUTHORIZATION=f"Bearer {response.data['access']}",
        )
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data['role'], 'admin')

        refreshed = self.client.post(
            '/api/v1/admin/auth/refresh/',
            {'refresh': response.data['refresh']},
            format='json',
        )
        self.assertEqual(refreshed.status_code, 200)
        self.assertIn('access', refreshed.data)

    def test_customer_is_rejected(self):
        response = self.client.post(
            '/api/v1/admin/auth/login/',
            {'email': 'customer@example.com', 'password': 'pass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_inactive_staff_is_rejected(self):
        self.staff.is_active = False
        self.staff.save(update_fields=['is_active'])
        response = self.client.post(
            '/api/v1/admin/auth/login/',
            {'email': 'staff@example.com', 'password': 'pass12345'},
            format='json',
        )
        self.assertEqual(response.status_code, 401)

    def test_anonymous_and_customer_cannot_call_admin_api(self):
        anonymous = self.client.get('/api/v1/admin/cities/')
        self.assertEqual(anonymous.status_code, 401)

        self.client.force_authenticate(user=self.customer)
        forbidden = self.client.get('/api/v1/admin/cities/')
        self.assertEqual(forbidden.status_code, 403)

    def test_django_admin_loads_for_superuser(self):
        User.objects.create_superuser(
            email='admin@example.com',
            password='pass12345',
            name='Admin',
        )
        client = Client()
        self.assertTrue(client.login(username='admin@example.com', password='pass12345'))
        response = client.get('/admin/')
        self.assertEqual(response.status_code, 200)

    def test_staff_can_block_and_cannot_block_self(self):
        self.client.force_authenticate(user=self.staff)
        blocked = self.client.patch(
            f'/api/v1/admin/users/{self.customer.id}/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(blocked.status_code, 200)
        self.customer.refresh_from_db()
        self.assertFalse(self.customer.is_active)

        own = self.client.patch(
            f'/api/v1/admin/users/{self.staff.id}/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(own.status_code, 400)
        self.staff.refresh_from_db()
        self.assertTrue(self.staff.is_active)
