import json
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.db import IntegrityError, transaction
from django.db.models import Avg, Count
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET, require_http_methods

from .models import Restaurant, Review
from .restaurant_name_validation import validate_restaurant_name
from .views import parse_cuisine_names, parse_float, restaurant_payload, validate_image


MAX_COMMENT_LENGTH = 2000


def json_body(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Nieprawidłowy format danych.") from exc

    if not isinstance(payload, dict):
        raise ValueError("Nieprawidłowy format danych.")

    return payload


def require_authenticated_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"detail": "Zaloguj się, aby wykonać tę operację."}, status=401)
    return None


def parse_review_data(payload):
    try:
        rating = int(payload.get("rating"))
    except (TypeError, ValueError) as exc:
        raise ValueError("Wybierz ocenę od 1 do 5.") from exc

    if rating < 1 or rating > 5:
        raise ValueError("Wybierz ocenę od 1 do 5.")

    comment = str(payload.get("comment", "")).strip()
    if len(comment) > MAX_COMMENT_LENGTH:
        raise ValueError("Komentarz może mieć maksymalnie 2000 znaków.")

    return rating, comment


def review_payload(review, current_user):
    return {
        "id": review.id,
        "rating": review.rating,
        "comment": review.comment,
        "author": review.author.username,
        "created_at": review.created_at.isoformat(),
        "updated_at": review.updated_at.isoformat(),
        "can_edit": current_user.is_authenticated and review.author_id == current_user.id,
    }


def detailed_restaurant_payload(restaurant, current_user):
    payload = restaurant_payload(restaurant)
    payload["owner"] = restaurant.owner.username if restaurant.owner else None
    payload["can_edit"] = current_user.is_authenticated and restaurant.owner_id == current_user.id
    payload["reviews"] = [review_payload(review, current_user) for review in restaurant.reviews.all()]
    return payload


def refresh_restaurant_rating(restaurant):
    stats = Review.objects.filter(restaurant=restaurant).aggregate(
        average=Avg("rating"),
        count=Count("id"),
    )
    average = stats["average"] or Decimal("0")
    restaurant.average_rating = Decimal(average).quantize(
        Decimal("0.1"), rounding=ROUND_HALF_UP
    )
    restaurant.review_count = stats["count"]
    restaurant.save(update_fields=["average_rating", "review_count"])


def get_restaurant_details(restaurant_id):
    return get_object_or_404(
        Restaurant.objects.select_related("owner").prefetch_related("cuisines", "reviews__author"),
        pk=restaurant_id,
    )


@require_GET
def restaurant_detail(request, restaurant_id):
    restaurant = get_restaurant_details(restaurant_id)
    return JsonResponse({"restaurant": detailed_restaurant_payload(restaurant, request.user)})


@require_http_methods(["POST"])
def create_review(request, restaurant_id):
    auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        rating, comment = parse_review_data(json_body(request))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    try:
        with transaction.atomic():
            restaurant = Restaurant.objects.select_for_update().get(pk=restaurant_id)
            if Review.objects.filter(restaurant=restaurant, author=request.user).exists():
                return JsonResponse(
                    {"detail": "Wystawiłeś już opinię tej restauracji. Możesz ją edytować."},
                    status=409,
                )

            review = Review.objects.create(
                restaurant=restaurant,
                author=request.user,
                rating=rating,
                comment=comment,
            )
            refresh_restaurant_rating(restaurant)
    except Restaurant.DoesNotExist:
        return JsonResponse({"detail": "Nie znaleziono restauracji."}, status=404)
    except IntegrityError:
        return JsonResponse(
            {"detail": "Wystawiłeś już opinię tej restauracji. Możesz ją edytować."},
            status=409,
        )

    return JsonResponse({"review": review_payload(review, request.user)}, status=201)


@require_http_methods(["PATCH"])
def update_review(request, review_id):
    auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        rating, comment = parse_review_data(json_body(request))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    with transaction.atomic():
        review = get_object_or_404(
            Review.objects.select_for_update().select_related("restaurant", "author"),
            pk=review_id,
        )
        if review.author_id != request.user.id:
            return JsonResponse({"detail": "Możesz edytować tylko własną opinię."}, status=403)

        restaurant = Restaurant.objects.select_for_update().get(pk=review.restaurant_id)
        review.rating = rating
        review.comment = comment
        review.save(update_fields=["rating", "comment", "updated_at"])
        refresh_restaurant_rating(restaurant)

    return JsonResponse({"review": review_payload(review, request.user)})


@require_http_methods(["DELETE"])
def delete_review(request, review_id):
    auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    with transaction.atomic():
        review = get_object_or_404(
            Review.objects.select_for_update().select_related("restaurant"),
            pk=review_id,
        )
        if review.author_id != request.user.id:
            return JsonResponse({"detail": "Możesz usunąć tylko własną opinię."}, status=403)

        restaurant = Restaurant.objects.select_for_update().get(pk=review.restaurant_id)
        review.delete()
        refresh_restaurant_rating(restaurant)

    return HttpResponse(status=204)


def parse_restaurant_update_data(request):
    name = request.POST.get("name", "").strip()
    address = request.POST.get("address", "").strip()
    description = request.POST.get("description", "").strip()

    if len(name) < 2:
        raise ValueError("Nazwa restauracji musi mieć co najmniej 2 znaki.")
    if len(name) > 150:
        raise ValueError("Nazwa restauracji jest zbyt długa.")
    if not address:
        raise ValueError("Podaj adres restauracji.")

    latitude = parse_float(request.POST.get("latitude"), "latitude", -90, 90)
    longitude = parse_float(request.POST.get("longitude"), "longitude", -180, 180)
    cuisines = parse_cuisine_names(request.POST.get("cuisine_names"))
    photo = request.FILES.get("photo")

    if photo is not None:
        validate_image(photo)

    return {
        "name": name,
        "address": address,
        "description": description,
        "latitude": Decimal(str(latitude)),
        "longitude": Decimal(str(longitude)),
        "cuisines": cuisines,
        "photo": photo,
    }


@require_http_methods(["POST"])
def update_restaurant(request, restaurant_id):
    auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    try:
        values = parse_restaurant_update_data(request)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    with transaction.atomic():
        restaurant = get_object_or_404(Restaurant.objects.select_for_update(), pk=restaurant_id)
        if restaurant.owner_id != request.user.id:
            return JsonResponse({"detail": "Możesz edytować tylko własną restaurację."}, status=403)

        try:
            name = validate_restaurant_name(
                values["name"],
                exclude_restaurant_id=restaurant.id,
            )
        except ValueError as error:
            return JsonResponse({"detail": str(error)}, status=400)

        restaurant.name = name
        restaurant.address = values["address"]
        restaurant.description = values["description"]
        restaurant.latitude = values["latitude"]
        restaurant.longitude = values["longitude"]
        if values["photo"] is not None:
            restaurant.photo = values["photo"]
        restaurant.save()
        restaurant.cuisines.set(values["cuisines"])

    restaurant = get_restaurant_details(restaurant.id)
    return JsonResponse({"restaurant": detailed_restaurant_payload(restaurant, request.user)})


@require_http_methods(["DELETE"])
def delete_restaurant(request, restaurant_id):
    auth_error = require_authenticated_user(request)
    if auth_error:
        return auth_error

    with transaction.atomic():
        restaurant = get_object_or_404(Restaurant.objects.select_for_update(), pk=restaurant_id)
        if restaurant.owner_id != request.user.id:
            return JsonResponse({"detail": "Możesz usunąć tylko własną restaurację."}, status=403)
        restaurant.delete()

    return HttpResponse(status=204)
