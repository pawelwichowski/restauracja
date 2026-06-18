from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("restaurants", "0002_restaurant_owner_photo"),
    ]

    operations = [
        migrations.CreateModel(
            name="Review",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "rating",
                    models.PositiveSmallIntegerField(
                        validators=[MinValueValidator(1), MaxValueValidator(5)]
                    ),
                ),
                ("comment", models.TextField(blank=True, max_length=2000)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="reviews",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "restaurant",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="reviews",
                        to="restaurants.restaurant",
                    ),
                ),
            ],
            options={"ordering": ["-updated_at", "-created_at"]},
        ),
        migrations.AddConstraint(
            model_name="review",
            constraint=models.UniqueConstraint(
                fields=("restaurant", "author"),
                name="unique_review_per_restaurant_and_author",
            ),
        ),
        migrations.AddConstraint(
            model_name="review",
            constraint=models.CheckConstraint(
                check=models.Q(("rating__gte", 1), ("rating__lte", 5)),
                name="review_rating_range",
            ),
        ),
    ]
