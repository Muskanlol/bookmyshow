from django.conf import settings
from django.db import models
from django.db.models import Q


class Tier(models.TextChoices):
    PREMIER = 'premier', 'Premier'
    GOLD = 'gold', 'Gold'
    SILVER = 'silver', 'Silver'


class City(models.Model):
    name = models.CharField(max_length=100)
    state = models.CharField(max_length=100)

    class Meta:
        ordering = ['name', 'state']
        constraints = [
            models.UniqueConstraint(fields=['name', 'state'], name='unique_city_name_state'),
        ]
        verbose_name_plural = 'cities'

    def __str__(self):
        return f'{self.name}, {self.state}'


class Movie(models.Model):
    class Certificate(models.TextChoices):
        U = 'U', 'U'
        UA = 'UA', 'U/A'
        A = 'A', 'A'
        S = 'S', 'S'

    class Status(models.TextChoices):
        COMING_SOON = 'coming_soon', 'Coming Soon'
        NOW_SHOWING = 'now_showing', 'Now Showing'
        ENDED = 'ended', 'Ended'

    title = models.CharField(max_length=200)
    description = models.TextField()
    duration_min = models.PositiveIntegerField()
    language = models.CharField(max_length=50)
    genre = models.CharField(max_length=50)
    certificate = models.CharField(max_length=10, choices=Certificate.choices)
    release_date = models.DateField()
    poster = models.ImageField(upload_to='posters/', blank=True, null=True)
    trailer_url = models.URLField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMING_SOON,
    )
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    class Meta:
        ordering = ['title']
        constraints = [
            models.CheckConstraint(condition=Q(duration_min__gt=0), name='movie_duration_positive'),
            models.CheckConstraint(
                condition=Q(avg_rating__gte=0, avg_rating__lte=5),
                name='movie_rating_range',
            ),
        ]

    def __str__(self):
        return self.title


class CastMember(models.Model):
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='cast_members')
    name = models.CharField(max_length=100)
    role = models.CharField(max_length=50)
    photo = models.ImageField(upload_to='cast/', blank=True, null=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.name} ({self.role})'


class Theatre(models.Model):
    city = models.ForeignKey(City, on_delete=models.PROTECT, related_name='theatres')
    name = models.CharField(max_length=150)
    address = models.TextField()
    amenities = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['city', 'name'], name='unique_theatre_name_per_city'),
        ]

    def __str__(self):
        return self.name


class Screen(models.Model):
    theatre = models.ForeignKey(Theatre, on_delete=models.CASCADE, related_name='screens')
    name = models.CharField(max_length=100)
    total_rows = models.PositiveIntegerField(default=0)
    total_cols = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(fields=['theatre', 'name'], name='unique_screen_name_per_theatre'),
        ]

    def __str__(self):
        return f'{self.theatre.name} - {self.name}'


class SeatTemplate(models.Model):
    screen = models.ForeignKey(Screen, on_delete=models.CASCADE, related_name='seats')
    row_index = models.PositiveIntegerField()
    col_index = models.PositiveIntegerField()
    row_label = models.CharField(max_length=4)
    number = models.PositiveIntegerField(null=True, blank=True)
    tier = models.CharField(max_length=20, blank=True, default='')
    is_blocked = models.BooleanField(default=False)
    is_aisle = models.BooleanField(default=False)

    class Meta:
        ordering = ['row_index', 'col_index']
        constraints = [
            models.UniqueConstraint(
                fields=['screen', 'row_index', 'col_index'],
                name='unique_seat_position',
            ),
        ]

    @property
    def label(self):
        if self.is_aisle or self.number is None:
            return ''
        return f'{self.row_label}{self.number}'

    def __str__(self):
        if self.is_aisle:
            return f'{self.row_label} aisle'
        return self.label or f'{self.row_label}?'


class Review(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='reviews')
    rating = models.PositiveSmallIntegerField()
    text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'movie'], name='unique_review_per_user_movie'),
            models.CheckConstraint(
                condition=Q(rating__gte=1, rating__lte=5),
                name='review_rating_between_1_and_5',
            ),
        ]

    def __str__(self):
        return f'{self.movie} ({self.rating})'
