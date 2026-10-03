from datetime import datetime

from django.test import TestCase
from django.utils.dateparse import parse_datetime

from catalog.models import Movie
from config.testing import make_movie, make_screen, make_show, staff_client
from config.utils import IST
from shows.models import Show


def show_payload(movie, screen, start, price='200.00', tier='gold'):
    return {
        'movie': movie.id,
        'screen': screen.id,
        'start_time': start.isoformat(),
        'tier_prices': [{'tier': tier, 'price': price}],
    }


class ShowApiTests(TestCase):
    def setUp(self):
        self.client, _user = staff_client()

    def test_end_time_includes_gap_and_back_to_back_is_allowed(self):
        screen = make_screen()
        movie = make_movie(duration_min=120)
        first = self.client.post(
            '/api/v1/admin/shows/',
            show_payload(movie, screen, datetime(2026, 11, 5, 10, 0, tzinfo=IST)),
            format='json',
        )
        self.assertEqual(first.status_code, 201, first.data)
        end = parse_datetime(first.data['end_time']).astimezone(IST)
        self.assertEqual((end.hour, end.minute), (12, 20))

        second = self.client.post(
            '/api/v1/admin/shows/',
            show_payload(movie, screen, datetime(2026, 11, 5, 12, 20, tzinfo=IST)),
            format='json',
        )
        self.assertEqual(second.status_code, 201, second.data)

        overlap = self.client.post(
            '/api/v1/admin/shows/',
            show_payload(movie, screen, datetime(2026, 11, 5, 12, 19, tzinfo=IST)),
            format='json',
        )
        self.assertEqual(overlap.status_code, 400)
        self.assertTrue(overlap.data['conflicts'])

        listed = self.client.get('/api/v1/admin/shows/', {
            'date': '2026-11-05',
            'theatre': screen.theatre_id,
            'movie': movie.id,
        })
        self.assertEqual(listed.data['count'], 2)

    def test_bulk_create_rejects_internal_overlap_and_creates_the_rest(self):
        screen = make_screen()
        long_movie = make_movie(title='Long Film', duration_min=180)
        rejected = self.client.post(
            '/api/v1/admin/shows/bulk-create/',
            {
                'movie': long_movie.id,
                'screen_ids': [screen.id],
                'date_from': '2026-12-01',
                'date_to': '2026-12-01',
                'time_slots': ['10:00', '12:00'],
                'tier_prices': [{'tier': 'gold', 'price': '200.00'}],
            },
            format='json',
        )
        self.assertEqual(rejected.status_code, 400, rejected.data)
        self.assertEqual(Show.objects.count(), 0)

        movie = make_movie(title='Short Film', duration_min=120)
        created = self.client.post(
            '/api/v1/admin/shows/bulk-create/',
            {
                'movie': movie.id,
                'screen_ids': [screen.id],
                'date_from': '2026-12-01',
                'date_to': '2026-12-02',
                'time_slots': ['10:00', '14:00'],
                'tier_prices': [{'tier': 'gold', 'price': '200.00'}],
            },
            format='json',
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['created'], 4)
        self.assertEqual(Show.objects.count(), 4)

    def test_missing_price_ended_movie_and_duration_lock(self):
        screen = make_screen()
        movie = make_movie()
        missing = self.client.post(
            '/api/v1/admin/shows/',
            show_payload(
                movie,
                screen,
                datetime(2026, 11, 8, 10, 0, tzinfo=IST),
                tier='silver',
            ),
            format='json',
        )
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(Show.objects.count(), 0)

        ended = make_movie(title='Old Film', status=Movie.Status.ENDED)
        rejected = self.client.post(
            '/api/v1/admin/shows/',
            show_payload(ended, screen, datetime(2026, 11, 8, 10, 0, tzinfo=IST)),
            format='json',
        )
        self.assertEqual(rejected.status_code, 400)

        show = make_show(screen=screen, movie=movie, start=datetime(2026, 11, 8, 16, 0, tzinfo=IST))
        locked = self.client.patch(
            f'/api/v1/admin/movies/{movie.id}/',
            {'duration_min': 90},
            format='json',
        )
        self.assertEqual(locked.status_code, 400)
        movie.refresh_from_db()
        self.assertEqual(movie.duration_min, 120)
