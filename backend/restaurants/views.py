from decimal import Decimal, InvalidOperation

from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Cuisine, Restaurant

SORTING = {
    "rating-desc": ("-average_rating", "name"),
    "rating-asc": ("average_rating", "name"),
    "name-asc": ("name",),
}


def parse_minimum_rating(value):
    if value in (None, ""):
        return Decimal("0")

    try:
        rating = Decimal(value)
    except InvalidOperation as exc:
        raise ValueError("Parametr min_rating musi być liczbą od 0 do 5.") from exc

    if not Decimal("0") <= rating <= Decimal("5"):
        raise ValueError("Parametr min_rating musi być liczbą od 0 do 5.")

    return rating


@require_GET
def restaurant_list(request):
    name = request.GET.get("name", "").strip()
    selected_cuisine = request.GET.get("cuisine", "").strip()
    sort = request.GET.get("sort", "rating-desc")

    if sort not in SORTING:
        return JsonResponse({"detail": "Nieprawidłowy sposób sortowania."}, status=400)

    try:
        minimum_rating = parse_minimum_rating(request.GET.get("min_rating"))
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    queryset = Restaurant.objects.prefetch_related("cuisines")

    if name:
        queryset = queryset.filter(name__icontains=name)

    if selected_cuisine:
        queryset = queryset.filter(cuisines__name=selected_cuisine)

    queryset = queryset.filter(average_rating__gte=minimum_rating).order_by(*SORTING[sort]).distinct()

    results = [
        {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "description": restaurant.description,
            "latitude": float(restaurant.latitude) if restaurant.latitude is not None else None,
            "longitude": float(restaurant.longitude) if restaurant.longitude is not None else None,
            "average_rating": float(restaurant.average_rating),
            "review_count": restaurant.review_count,
            "cuisines": [cuisine.name for cuisine in restaurant.cuisines.all()],
        }
        for restaurant in queryset
    ]

    return JsonResponse(
        {
            "count": len(results),
            "available_cuisines": list(Cuisine.objects.values_list("name", flat=True)),
            "results": results,
        }
    )
