from django.urls import path

from .views import nearby_restaurant_list, restaurant_list

urlpatterns = [
    path("restaurants", restaurant_list, name="restaurant-list"),
    path("restaurants/nearby", nearby_restaurant_list, name="nearby-restaurant-list"),
]
