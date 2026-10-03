from django.core.management.base import BaseCommand

from bookings.services import purge_expired_holds


class Command(BaseCommand):
    help = 'Delete expired seat holds and mark their pending bookings as expired.'

    def handle(self, *args, **options):
        holds, bookings = purge_expired_holds()
        self.stdout.write(f'Deleted {holds} expired holds. Expired {bookings} pending bookings.')
