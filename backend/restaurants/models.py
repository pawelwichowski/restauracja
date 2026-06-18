from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Cuisine(models.Model):
    name = models.CharField(max_length=60, unique=True)
    slug = models.SlugField(max_length=70, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "rodzaj kuchni"
        verbose_name_plural = "rodzaje kuchni"

    def __str__(self):
        return self.name


class Restaurant(models.Model):
    name = models.CharField(max_length=150, db_index=True)
    address = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    photo = models.ImageField(upload_to="restaurants/", blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="restaurants",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    average_rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    review_count = models.PositiveIntegerField(default=0)
    cuisines = models.ManyToManyField(Cuisine, related_name="restaurants")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(average_rating__gte=0)
                & models.Q(average_rating__lte=5),
                name="restaurant_average_rating_range",
            )
        ]

    def __str__(self):
        return self.name


class Review(models.Model):
    restaurant = models.ForeignKey(Restaurant, related_name="reviews", on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="reviews", on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True, max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "author"],
                name="unique_review_per_restaurant_and_author",
            ),
            models.CheckConstraint(
                check=models.Q(rating__gte=1) & models.Q(rating__lte=5),
                name="review_rating_range",
            ),
        ]

    def __str__(self):
        return f"{self.restaurant} — {self.rating}/5 by {self.author}"
