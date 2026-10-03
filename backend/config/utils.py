from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

IST = ZoneInfo('Asia/Kolkata')


def as_aware(value):
    """Treat a naive datetime as Asia/Kolkata. Aware values are left unchanged."""
    if timezone.is_naive(value):
        return value.replace(tzinfo=IST)
    return value


def local_day_bounds(day):
    start = datetime.combine(day, time.min, tzinfo=IST)
    return start, start + timedelta(days=1)
