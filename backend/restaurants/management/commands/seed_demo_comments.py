from django.core.management.base import BaseCommand

from restaurants.models import Restaurant, Review


DEMO_COMMENTS = [
    (
        "Ramen Nori",
        "demo_ocena_ania",
        "Pyszny ramen, aromatyczny bulion i szybka obsługa.",
    ),
    (
        "Trattoria Bella",
        "demo_ocena_bartek",
        "Świetna pizza oraz świeży makaron. Na pewno wrócę ponownie.",
    ),
    (
        "Masala House",
        "demo_ocena_celina",
        "Dobre curry, aromatyczne przyprawy i bardzo miła obsługa.",
    ),
    (
        "Casa Picante",
        "demo_ocena_dawid",
        "Tacos były świeże, ale sos mógł być trochę mniej ostry.",
    ),
    (
        "Verde Bistro",
        "demo_ocena_ela",
        "Roślinne śniadanie, dobra kawa i spokojna atmosfera.",
    ),
    (
        "Złota Kaczka",
        "demo_ocena_filip",
        "Klasyczna kuchnia polska, a porcje są naprawdę duże.",
    ),
]


class Command(BaseCommand):
    help = "Adds optional demo comments to existing demo reviews for fulltext search tests."

    def handle(self, *args, **options):
        updated = 0
        skipped = []

        for restaurant_name, username, comment in DEMO_COMMENTS:
            review = (
                Review.objects.select_related("restaurant", "author")
                .filter(restaurant__name=restaurant_name, author__username=username)
                .first()
            )
            if review is None:
                skipped.append(f"{restaurant_name} ({username})")
                continue

            review.comment = comment
            review.save(update_fields=["comment", "updated_at"])
            updated += 1

        self.stdout.write(
            self.style.SUCCESS(f"Demo comments added or updated: {updated}.")
        )
        if skipped:
            self.stdout.write(
                self.style.WARNING(
                    "Run seed_demo_reviews first. Missing demo reviews: " + ", ".join(skipped)
                )
            )
