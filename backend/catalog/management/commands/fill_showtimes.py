from django.core.management.base import BaseCommand

from catalog.management.commands.seed import fill_remaining_showtimes


class Command(BaseCommand):
    help = (
        'Add showtimes for now-showing movies that have no upcoming show '
        'in a city. Existing shows, bookings, and holds are not changed.'
    )

    def handle(self, *args, **options):
        screens, shows = fill_remaining_showtimes()
        self.stdout.write(
            self.style.SUCCESS(f'Added {screens} screens and {shows} shows.')
        )
