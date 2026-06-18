from django.urls import path

from .views import restaurant_list

urlpatterns = [
    path("restaurants", restaurant_list, name="restaurant-list"),
]
