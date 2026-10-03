from datetime import timedelta
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient

from accounts.models import User
from bookings.models import BookedSeat
from catalog.models import City, Movie, Screen, SeatTemplate
from config.testing import make_confirmed_booking, make_show, staff_client
from shows.models import Show


def png_file(name):
    buffer = BytesIO()
    Image.new('RGB', (8, 8), (180, 30, 50)).save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


class CatalogApiTests(TestCase):
    def setUp(self):
        self.client, _user = staff_client()

    def test_city_theatre_and_protected_delete(self):
        created = self.client.post(
            '/api/v1/admin/cities/',
            {'name': 'Mumbai', 'state': 'Maharashtra'},
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        duplicate = self.client.post(
            '/api/v1/admin/cities/',
            {'name': 'mumbai', 'state': 'maharashtra'},
            format='json',
        )
        self.assertEqual(duplicate.status_code, 400)

        theatre = self.client.post(
            '/api/v1/admin/theatres/',
            {
                'city': created.data['id'],
                'name': 'Galaxy Cinemas',
                'address': '1 Link Road',
                'amenities': ['Parking'],
            },
            format='json',
        )
        self.assertEqual(theatre.status_code, 201)
        self.assertEqual(theatre.data['city_name'], 'Mumbai')

        blocked = self.client.delete(f"/api/v1/admin/cities/{created.data['id']}/")
        self.assertEqual(blocked.status_code, 400)
        self.assertTrue(City.objects.filter(pk=created.data['id']).exists())

    def test_movie_cast_round_trip(self):
        created = self.client.post(
            '/api/v1/admin/movies/',
            {
                'title': 'Paper Planes',
                'description': 'A comedy about a lost ticket.',
                'duration_min': 110,
                'language': 'English',
                'genre': 'Comedy',
                'certificate': 'U',
                'release_date': '2026-09-01',
                'status': 'now_showing',
                'cast': [{'name': 'Asha Menon', 'role': 'Actor'}],
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data['cast'][0]['name'], 'Asha Menon')
        self.assertIsNone(created.data['poster'])

        cleared = self.client.patch(
            f"/api/v1/admin/movies/{created.data['id']}/",
            {'cast': []},
            format='json',
        )
        self.assertEqual(cleared.status_code, 200)
        self.assertEqual(cleared.data['cast'], [])

    def test_poster_and_cast_photo_upload(self):
        poster = png_file('poster.png')
        photo = png_file('face.png')
        created = self.client.post(
            '/api/v1/admin/movies/',
            {
                'title': 'Cast Photo',
                'description': 'A film with a face on the poster.',
                'duration_min': 100,
                'language': 'Hindi',
                'genre': 'Drama',
                'certificate': 'U',
                'release_date': '2026-09-01',
                'status': 'now_showing',
                'cast': '[{"name": "Riya Das", "role": "Actor"}]',
                'poster': poster,
                'cast_photo_0': photo,
            },
            format='multipart',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertIn('/media/posters/', created.data['poster'])
        self.assertIn('/media/cast/', created.data['cast'][0]['photo'])
        member_id = created.data['cast'][0]['id']

        kept = self.client.patch(
            f"/api/v1/admin/movies/{created.data['id']}/",
            {'cast': [{'id': member_id, 'name': 'Riya Das', 'role': 'Actor'}]},
            format='json',
        )
        self.assertEqual(kept.status_code, 200)
        self.assertIn('/media/cast/', kept.data['cast'][0]['photo'])

        cleared = self.client.patch(
            f"/api/v1/admin/movies/{created.data['id']}/",
            {
                'clear_poster': True,
                'cast': [{'id': member_id, 'name': 'Riya Das', 'role': 'Actor', 'clear_photo': True}],
            },
            format='json',
        )
        self.assertEqual(cleared.status_code, 200)
        self.assertIsNone(cleared.data['poster'])
        self.assertIsNone(cleared.data['cast'][0]['photo'])

        rejected = self.client.post(
            '/api/v1/admin/movies/',
            {
                'title': 'Bad File',
                'description': 'Not an image.',
                'duration_min': 90,
                'language': 'Hindi',
                'genre': 'Drama',
                'certificate': 'U',
                'release_date': '2026-09-01',
                'status': 'now_showing',
                'poster': SimpleUploadedFile('notes.txt', b'hello', content_type='text/plain'),
            },
            format='multipart',
        )
        self.assertEqual(rejected.status_code, 400)

    def test_seat_layout_numbers_aisles_and_blocks(self):
        city = self.client.post(
            '/api/v1/admin/cities/',
            {'name': 'Pune', 'state': 'Maharashtra'},
            format='json',
        ).data
        theatre = self.client.post(
            '/api/v1/admin/theatres/',
            {'city': city['id'], 'name': 'River Screens', 'address': '2 Lane'},
            format='json',
        ).data
        screen = self.client.post(
            '/api/v1/admin/screens/',
            {'theatre': theatre['id'], 'name': 'Screen 1'},
            format='json',
        )
        self.assertEqual(screen.status_code, 201)

        generated = self.client.post(
            f"/api/v1/admin/screens/{screen.data['id']}/generate-seats/",
            {
                'rows': 2,
                'cols': 4,
                'row_tiers': [
                    {'from_row': 1, 'to_row': 1, 'tier': 'premier'},
                    {'from_row': 2, 'to_row': 2, 'tier': 'gold'},
                ],
                'aisle_columns': [2],
            },
            format='json',
        )
        self.assertEqual(generated.status_code, 200)
        self.assertEqual(generated.data['total_rows'], 2)
        self.assertEqual(len(generated.data['seats']), 8)
        row_a = [seat for seat in generated.data['seats'] if seat['row_label'] == 'A']
        self.assertEqual([seat['number'] for seat in row_a], [1, None, 2, 3])
        self.assertTrue(row_a[1]['is_aisle'])
        self.assertEqual(row_a[0]['label'], 'A1')
        self.assertEqual(row_a[0]['tier'], 'premier')

        listed = self.client.get('/api/v1/admin/screens/')
        self.assertEqual(listed.data['results'][0]['seat_count'], 8)
        self.assertNotIn('seats', listed.data['results'][0])

        seat_id = row_a[0]['id']
        patched = self.client.patch(
            f"/api/v1/admin/screens/{screen.data['id']}/seats/",
            {'seats': [{'id': seat_id, 'is_blocked': True, 'tier': 'gold'}]},
            format='json',
        )
        self.assertEqual(patched.status_code, 200)
        updated = next(seat for seat in patched.data['seats'] if seat['id'] == seat_id)
        self.assertTrue(updated['is_blocked'])
        self.assertEqual(updated['tier'], 'gold')

        aisle_id = row_a[1]['id']
        rejected = self.client.patch(
            f"/api/v1/admin/screens/{screen.data['id']}/seats/",
            {'seats': [{'id': aisle_id, 'is_blocked': True}]},
            format='json',
        )
        self.assertEqual(rejected.status_code, 400)

    def test_layout_rebuild_keeps_cancelled_seat_labels(self):
        customer = User.objects.create_user(
            email='buyer@example.com',
            password='pass12345',
            name='Buyer',
            phone='9111111111',
        )
        show = make_show(start=timezone.now() + timedelta(days=1))
        booking = make_confirmed_booking(show, customer, seat_count=1)
        booked = booking.booked_seats.get()
        screen_id = show.screen_id

        blocked = self.client.post(
            f'/api/v1/admin/screens/{screen_id}/generate-seats/',
            {
                'rows': 1,
                'cols': 2,
                'row_tiers': [{'from_row': 1, 'to_row': 1, 'tier': 'silver'}],
            },
            format='json',
        )
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(SeatTemplate.objects.filter(screen_id=screen_id).count(), 8)

        booked.is_active = False
        booked.save(update_fields=['is_active'])
        rebuilt = self.client.post(
            f'/api/v1/admin/screens/{screen_id}/generate-seats/',
            {
                'rows': 1,
                'cols': 2,
                'row_tiers': [{'from_row': 1, 'to_row': 1, 'tier': 'silver'}],
            },
            format='json',
        )
        self.assertEqual(rebuilt.status_code, 200)
        booked.refresh_from_db()
        self.assertEqual(booked.seat_label, 'A1')
        self.assertIsNone(booked.seat_id)
        self.assertEqual(Screen.objects.get(pk=screen_id).total_cols, 2)


class SeedCommandTests(TestCase):
    def test_seed_is_idempotent_and_admin_can_log_in(self):
        call_command('seed')
        shows = Show.objects.count()
        self.assertGreater(shows, 0)
        self.assertTrue(Movie.objects.filter(status=Movie.Status.COMING_SOON).exists())
        self.assertTrue(BookedSeat.objects.filter(is_active=True).exists())
        now = timezone.now()
        cities = list(City.objects.all())
        self.assertGreaterEqual(len(cities), 3)
        for movie in Movie.objects.filter(status=Movie.Status.NOW_SHOWING):
            for city in cities:
                self.assertTrue(
                    Show.objects.filter(
                        movie=movie,
                        status=Show.Status.SCHEDULED,
                        start_time__gte=now,
                        screen__theatre__city=city,
                    ).exists(),
                    f'{movie.title} has no upcoming show in {city.name}',
                )
        coming = Movie.objects.filter(status=Movie.Status.COMING_SOON).first()
        self.assertFalse(Show.objects.filter(movie=coming).exists())

        call_command('seed')
        self.assertEqual(Show.objects.count(), shows)

        call_command('seed', '--reset')
        self.assertEqual(Show.objects.count(), shows)
        login = APIClient().post(
            '/api/v1/admin/auth/login/',
            {'email': 'admin@bookmyshow.test', 'password': 'Admin@12345'},
            format='json',
        )
        self.assertEqual(login.status_code, 200)
