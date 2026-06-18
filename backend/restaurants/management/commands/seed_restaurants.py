from django.core.management.base import BaseCommand
from django.utils.text import slugify
from restaurants.seed_data import SAMPLE_RESTAURANTS
from restaurants.models import Cuisine, Restaurant

class Command(BaseCommand):
    help = "Loads sample restaurants."

    def handle(self, *args, **options):
        created_count = 0
        for item in SAMPLE_RESTAURANTS:
            values = {key: value for key, value in item.items() if key != "cuisines"}
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
