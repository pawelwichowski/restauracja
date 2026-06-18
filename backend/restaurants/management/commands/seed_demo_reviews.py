from decimal import Decimal, ROUND_HALF_UP

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db.models import Avg, Count

from restaurants.models import Restaurant, Review


DEMO_USERS = [
    ("demo_ocena_ania", "demo.ania@smacznie.local"),
    ("demo_ocena_bartek", "demo.bartek@smacznie.local"),
    ("demo_ocena_celina", "demo.celina@smacznie.local"),
    ("demo_ocena_dawid", "demo.dawid@smacznie.local"),
    ("demo_ocena_ela", "demo.ela@smacznie.local"),
    ("demo_ocena_filip", "demo.filip@smacznie.local"),
]

# Każdy element odpowiada kolejnemu użytkownikowi z DEMO_USERS.
# Wszystkie komentarze pozostają puste, aby dane były wyłącznie przykładowymi ocenami.
DEMO_RATINGS = {
    "Trattoria Bella": [5, 5, 4, 5, 5, 4],
    "Ramen Nori": [5, 5, 5, 4, 5, 5],
    "Pyra i Spółka": [4, 4, 3, 4, 5, 4],
    "Masala House": [5, 4, 5, 5, 4, 5],
    "Verde Bistro": [4, 4, 3, 4, 4, 5],
    "Casa Picante": [5, 4, 5, 4, 5, 4],
    "Złota Kaczka": [3, 4, 3, 4, 3, 4],
    "Olive & Thyme": [4, 4, 5, 4, 3, 4],
}


def refresh_rating(restaurant):
    stats = Review.objects.filter(restaurant=restaurant).aggregate(
        average=Avg("rating"),
        count=Count("id"),
    )
    restaurant.average_rating = Decimal(stats["average"] or 0).quantize(
        Decimal("0.1"), rounding=ROUND_HALF_UP
    )
    restaurant.review_count = stats["count"]
    restaurant.save(update_fields=["average_rating", "review_count"])


class Command(BaseCommand):
    help = "Creates idempotent demo users and ratings without comments for sample restaurants."

    def handle(self, *args, **options):
        users = []
        created_users = 0
        created_or_updated_reviews = 0

        for username, email in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"email": email, "is_active": True},
            )
            if created:
                user.set_unusable_password()
                user.save(update_fields=["password"])
                created_users += 1
            users.append(user)

        missing_restaurants = []
        for restaurant_name, ratings in DEMO_RATINGS.items():
            restaurant = Restaurant.objects.filter(name=restaurant_name).first()
            if restaurant is None:
                missing_restaurants.append(restaurant_name)
                continue

            for user, rating in zip(users, ratings, strict=True):
                Review.objects.update_or_create(
                    restaurant=restaurant,
                    author=user,
                    defaults={"rating": rating, "comment": ""},
                )
                created_or_updated_reviews += 1

            refresh_rating(restaurant)

        self.stdout.write(
            self.style.SUCCESS(
                "Demo review seed complete: "
                f"users created={created_users}, "
                f"reviews created/updated={created_or_updated_reviews}."
            )
        )
        if missing_restaurants:
            self.stdout.write(
                self.style.WARNING(
                    "Skipped missing restaurants: " + ", ".join(missing_restaurants)
                )
            )
