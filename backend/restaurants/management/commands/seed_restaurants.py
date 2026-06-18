from django.core.management.base import BaseCommand
from django.utils.text import slugify

from restaurants.models import Cuisine, Restaurant
from restaurants.seed_data import SAMPLE_RESTAURANTS


class Command(BaseCommand):
    help = "Loads sample restaurants without overwriting ratings derived from reviews."

    def handle(self, *args, **options):
        created_count = 0
        for item in SAMPLE_RESTAURANTS:
            values = {
                key: value
                for key, value in item.items()
                if key not in {"cuisines", "average_rating", "review_count"}
            }
            restaurant, created = Restaurant.objects.update_or_create(
                name=item["name"], defaults=values
            )
            linked_cuisines = []
            for name in item["cuisines"]:
                cuisine, _ = Cuisine.objects.get_or_create(
                    name=name, defaults={"slug": slugify(name)}
                )
                linked_cuisines.append(cuisine)
            restaurant.cuisines.set(linked_cuisines)
            created_count += int(created)

        self.stdout.write(self.style.SUCCESS(f"New restaurants: {created_count}"))
