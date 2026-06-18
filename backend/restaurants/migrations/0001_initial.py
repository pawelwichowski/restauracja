import decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Cuisine",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=60, unique=True)),
                ("slug", models.SlugField(max_length=70, unique=True)),
            ],
            options={
                "verbose_name": "rodzaj kuchni",
                "verbose_name_plural": "rodzaje kuchni",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Restaurant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(db_index=True, max_length=150)),
                ("address", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("latitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ("average_rating", models.DecimalField(decimal_places=1, default=decimal.Decimal("0"), max_digits=2, validators=[django.core.validators.MinValueValidator(0), django.core.validators.MaxValueValidator(5)])),
                ("review_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("cuisines", models.ManyToManyField(related_name="restaurants", to="restaurants.cuisine")),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.AddConstraint(
            model_name="restaurant",
            constraint=models.CheckConstraint(
                check=models.Q(("average_rating__gte", 0), ("average_rating__lte", 5)),
                name="restaurant_average_rating_range",
            ),
        ),
    ]
