from django.urls import path

from . import auth_views
from .views import nearby_restaurant_list, restaurant_list

urlpatterns = [
    path("restaurants", restaurant_list, name="restaurant-list"),
    path("restaurants/nearby", nearby_restaurant_list, name="nearby-restaurant-list"),
    path("auth/csrf", auth_views.csrf_token, name="auth-csrf"),
    path("auth/me", auth_views.current_user, name="auth-me"),
    path("auth/register", auth_views.register, name="auth-register"),
    path("auth/login", auth_views.sign_in, name="auth-login"),
    path("auth/logout", auth_views.sign_out, name="auth-logout"),
    path("auth/password-reset", auth_views.password_reset_request, name="password-reset-request"),
    path(
        "auth/password-reset/confirm",
        auth_views.password_reset_confirm,
        name="password-reset-confirm",
    ),
]
