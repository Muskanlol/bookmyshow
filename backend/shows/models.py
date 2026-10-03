from django.db import models
from django.db.models import Q

from catalog.models import Movie, Screen, Tier


class Show(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        CANCELLED = 'cancelled', 'Cancelled'
        COMPLETED = 'completed', 'Completed'

    movie = models.ForeignKey(Movie, on_delete=models.PROTECT, related_name='shows')
    screen = models.ForeignKey(Screen, on_delete=models.PROTECT, related_name='shows')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )

    class Meta:
        ordering = ['start_time']
        indexes = [
            models.Index(fields=['start_time']),
            models.Index(fields=['status', 'start_time']),
        ]

    def __str__(self):
        return f'{self.movie} @ {self.screen} {self.start_time:%Y-%m-%d %H:%M}'


class ShowTierPrice(models.Model):
    show = models.ForeignKey(Show, on_delete=models.CASCADE, related_name='tier_prices')
    tier = models.CharField(max_length=20, choices=Tier.choices)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['tier']
        constraints = [
            models.UniqueConstraint(fields=['show', 'tier'], name='unique_show_tier_price'),
            models.CheckConstraint(condition=Q(price__gt=0), name='show_tier_price_positive'),
        ]

    def __str__(self):
        return f'{self.show_id} {self.tier} {self.price}'
