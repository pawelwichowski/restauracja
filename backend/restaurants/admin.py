from django.contrib import admin

from .models import Cuisine, Restaurant


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
