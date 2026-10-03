from decimal import Decimal

from django.db import models
from django.db.models import F, Q


class Coupon(models.Model):
    class Type(models.TextChoices):
        PERCENT = 'percent', 'Percent'
        FLAT = 'flat', 'Flat'

    code = models.CharField(max_length=30, unique=True)
    type = models.CharField(max_length=10, choices=Type.choices)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    max_uses = models.PositiveIntegerField()
    used_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['code']
        constraints = [
            models.CheckConstraint(condition=Q(value__gt=0), name='coupon_value_positive'),
            models.CheckConstraint(
                condition=Q(valid_to__gt=F('valid_from')),
                name='coupon_valid_window',
            ),
            models.CheckConstraint(
                condition=Q(used_count__lte=F('max_uses')),
                name='coupon_used_within_max',
            ),
        ]

    def __str__(self):
        return self.code
