from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Avg
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCustomer
from shows.models import Show

from .models import City, Movie, Review


def poster_url(movie, request):
    if not movie.poster:
        return None
    return request.build_absolute_uri(movie.poster.url)


def movie_card(movie, request):
    return {
        'id': movie.id,
        'title': movie.title,
        'language': movie.language,
        'genre': movie.genre,
        'certificate': movie.certificate,
        'duration_min': movie.duration_min,
        'release_date': movie.release_date,
        'status': movie.status,
        'avg_rating': movie.avg_rating,
        'poster': poster_url(movie, request),
    }


class CityListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cities = (
            City.objects.filter(theatres__is_active=True)
            .distinct()
            .order_by('name', 'state')
        )
        return Response([
            {'id': city.id, 'name': city.name, 'state': city.state}
            for city in cities
        ])


class MovieListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        movies = Movie.objects.exclude(status=Movie.Status.ENDED)
        status = request.query_params.get('status')
        if status in {Movie.Status.NOW_SHOWING, Movie.Status.COMING_SOON}:
            movies = movies.filter(status=status)
        language = request.query_params.get('language')
        if language:
            movies = movies.filter(language__iexact=language)
        genre = request.query_params.get('genre')
        if genre:
            movies = movies.filter(genre__iexact=genre)
        search = (request.query_params.get('search') or '').strip()
        if search:
            movies = movies.filter(title__icontains=search)
        movies = movies.order_by('-avg_rating', 'title')
        return Response([movie_card(movie, request) for movie in movies])


class MovieDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        movie = get_object_or_404(Movie, pk=pk)
        reviews = movie.reviews.select_related('user').order_by('-created_at')[:8]
        data = movie_card(movie, request)
        data.update({
            'description': movie.description,
            'trailer_url': movie.trailer_url,
            'cast': [
                {
                    'id': person.id,
                    'name': person.name,
                    'role': person.role,
                    'photo': request.build_absolute_uri(person.photo.url) if person.photo else None,
                }
                for person in movie.cast_members.all()
            ],
            'reviews': [
                {
                    'id': review.id,
                    'name': review.user.name,
                    'rating': review.rating,
                    'text': review.text,
                    'created_at': review.created_at,
                }
                for review in reviews
            ],
        })
        return Response(data)


class MovieShowsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        movie = get_object_or_404(Movie.objects.exclude(status=Movie.Status.ENDED), pk=pk)
        city_id = request.query_params.get('city')
        city = None
        if city_id:
            city = City.objects.filter(pk=city_id).first()
        if city is None:
            city = City.objects.order_by('name').first()
        if city is None:
            return Response({'detail': 'No cities are available yet.'}, status=404)

        now = timezone.now()
        upcoming = Show.objects.filter(
            movie=movie,
            status=Show.Status.SCHEDULED,
            start_time__gte=now,
            screen__theatre__city=city,
            screen__theatre__is_active=True,
        )
        dates = list(
            upcoming.annotate(day=TruncDate('start_time'))
            .values_list('day', flat=True)
            .distinct()
            .order_by('day')
        )
        raw_date = request.query_params.get('date')
        selected = None
        if raw_date:
            try:
                selected = date.fromisoformat(raw_date)
            except ValueError:
                return Response({'detail': 'Date must be YYYY-MM-DD.'}, status=400)
        if selected is None:
            selected = dates[0] if dates else timezone.localdate()

        day_shows = (
            upcoming.filter(start_time__date=selected)
            .select_related('screen__theatre')
            .prefetch_related('tier_prices')
            .order_by('screen__theatre__name', 'start_time', 'id')
        )
        theatres = {}
        for show in day_shows:
            theatre = show.screen.theatre
            bucket = theatres.setdefault(theatre.id, {
                'id': theatre.id,
                'name': theatre.name,
                'address': theatre.address,
                'amenities': theatre.amenities or [],
                'shows': [],
            })
            prices = list(show.tier_prices.all())
            min_price = min((row.price for row in prices), default=None)
            bucket['shows'].append({
                'id': show.id,
                'screen': show.screen.name,
                'start_time': show.start_time,
                'end_time': show.end_time,
                'min_price': min_price,
            })

        return Response({
            'movie': movie_card(movie, request),
            'city': {'id': city.id, 'name': city.name, 'state': city.state},
            'date': selected,
            'dates': dates,
            'theatres': list(theatres.values()),
        })


class ReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(min_value=1, max_value=5)
    text = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class ReviewCreateView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        movie = get_object_or_404(Movie, pk=pk)
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review, _created = Review.objects.update_or_create(
            user=request.user,
            movie=movie,
            defaults={
                'rating': serializer.validated_data['rating'],
                'text': serializer.validated_data.get('text', '').strip(),
            },
        )
        average = movie.reviews.aggregate(value=Avg('rating'))['value']
        movie.avg_rating = Decimal(str(average)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        movie.save(update_fields=['avg_rating'])
        return Response(
            {
                'id': review.id,
                'name': request.user.name,
                'rating': review.rating,
                'text': review.text,
                'created_at': review.created_at,
                'avg_rating': movie.avg_rating,
            },
            status=201,
        )
