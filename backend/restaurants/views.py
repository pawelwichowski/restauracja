from decimal import Decimal, InvalidOperation

from django.db.models import FloatField
from django.db.models.expressions import RawSQL
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Cuisine, Restaurant

EARTH_RADIUS_KM = 6371.0088
MAX_RADIUS_KM = 50

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


def parse_float(value, parameter_name, minimum, maximum):
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            f"Parametr {parameter_name} musi być liczbą od {minimum} do {maximum}."
        ) from exc

    if not minimum <= number <= maximum:
        raise ValueError(
            f"Parametr {parameter_name} musi być liczbą od {minimum} do {maximum}."
        )

    return number


def parse_location(request, location_required=False):
    latitude_value = request.GET.get("latitude")
    longitude_value = request.GET.get("longitude")
    has_latitude = latitude_value not in (None, "")
    has_longitude = longitude_value not in (None, "")

    if not has_latitude and not has_longitude:
        if location_required:
            raise ValueError("Parametry latitude i longitude są wymagane.")
        return None

    if not has_latitude or not has_longitude:
        raise ValueError("Parametry latitude i longitude muszą być podane razem.")

    latitude = parse_float(latitude_value, "latitude", -90, 90)
    longitude = parse_float(longitude_value, "longitude", -180, 180)
    radius = parse_float(request.GET.get("radius_km", 5), "radius_km", 0.1, MAX_RADIUS_KM)

    return {"latitude": latitude, "longitude": longitude, "radius_km": radius}


def add_distance_annotation(queryset, latitude, longitude):
    # Wzór Haversine'a wykonywany przez MySQL. LEAST/GREATEST chroni ACOS
    # przed minimalnymi błędami zaokrągleń poza zakresem od -1 do 1.
    distance_sql = """
        %s * ACOS(
            LEAST(1.0, GREATEST(-1.0,
                COS(RADIANS(latitude)) * COS(RADIANS(%s)) *
                COS(RADIANS(longitude) - RADIANS(%s)) +
                SIN(RADIANS(latitude)) * SIN(RADIANS(%s))
            ))
        )
    """

    return queryset.annotate(
        distance_km=RawSQL(
            distance_sql,
            [EARTH_RADIUS_KM, latitude, longitude, latitude],
            output_field=FloatField(),
        )
    )


def build_restaurant_response(request, location_required=False):
    name = request.GET.get("name", "").strip()
    selected_cuisine = request.GET.get("cuisine", "").strip()
    sort = request.GET.get("sort", "rating-desc")

    if sort not in {*SORTING, "distance-asc"}:
        return JsonResponse({"detail": "Nieprawidłowy sposób sortowania."}, status=400)

    try:
        minimum_rating = parse_minimum_rating(request.GET.get("min_rating"))
        location = parse_location(request, location_required=location_required)
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    if sort == "distance-asc" and location is None:
        return JsonResponse(
            {"detail": "Sortowanie według odległości wymaga parametrów latitude i longitude."},
            status=400,
        )

    queryset = Restaurant.objects.prefetch_related("cuisines")

    if name:
        queryset = queryset.filter(name__icontains=name)

    if selected_cuisine:
        queryset = queryset.filter(cuisines__name=selected_cuisine)

    queryset = queryset.filter(average_rating__gte=minimum_rating)

    if location is not None:
        queryset = queryset.exclude(latitude__isnull=True).exclude(longitude__isnull=True)
        queryset = add_distance_annotation(
            queryset, location["latitude"], location["longitude"]
        ).filter(distance_km__lte=location["radius_km"])

    if sort == "distance-asc":
        queryset = queryset.order_by("distance_km", "name")
    else:
        queryset = queryset.order_by(*SORTING[sort])

    queryset = queryset.distinct()

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
            "distance_km": (
                round(float(restaurant.distance_km), 2)
                if location is not None
                else None
            ),
        }
        for restaurant in queryset
    ]

    return JsonResponse(
        {
            "count": len(results),
            "available_cuisines": list(Cuisine.objects.values_list("name", flat=True)),
            "location": location,
            "results": results,
        }
    )


@require_GET
def restaurant_list(request):
    return build_restaurant_response(request)


@require_GET
def nearby_restaurant_list(request):
    return build_restaurant_response(request, location_required=True)
