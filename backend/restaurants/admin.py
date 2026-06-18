from django.contrib import admin

from .models import Cuisine, Restaurant, Review


@admin.register(Cuisine)
class CuisineAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "average_rating", "review_count", "address")
    list_filter = ("cuisines",)
    search_fields = ("name", "address", "owner__username")
    filter_horizontal = ("cuisines",)
    readonly_fields = ("created_at",)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "author", "rating", "updated_at")
    list_filter = ("rating",)
    search_fields = ("restaurant__name", "author__username", "comment")
    readonly_fields = ("created_at", "updated_at")
