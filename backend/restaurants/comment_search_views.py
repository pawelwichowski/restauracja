import re

from django.db.models import FloatField
from django.db.models.expressions import RawSQL
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .models import Review


MAX_QUERY_LENGTH = 100
MAX_RESULTS = 50
MIN_TOKEN_LENGTH = 3
SEARCHABLE_TOKEN = re.compile(r"[^\W_]{3,}", re.UNICODE)


def search_result_payload(review):
    return {
        "review_id": review.id,
        "restaurant_id": review.restaurant_id,
        "restaurant_name": review.restaurant.name,
        "restaurant_photo_url": review.restaurant.photo.url if review.restaurant.photo else None,
        "author": review.author.username,
        "rating": review.rating,
        "comment": review.comment,
        "updated_at": review.updated_at.isoformat(),
        "relevance": round(float(review.relevance), 4),
    }


@require_GET
def comment_search(request):
    if not request.user.is_authenticated:
        return JsonResponse(
            {"detail": "Zaloguj się, aby wyszukiwać komentarze."},
            status=401,
        )

    query = request.GET.get("q", "").strip()
    if not query:
        return JsonResponse({"detail": "Wpisz frazę do wyszukania."}, status=400)
    if len(query) > MAX_QUERY_LENGTH:
        return JsonResponse(
            {"detail": f"Zapytanie może mieć maksymalnie {MAX_QUERY_LENGTH} znaków."},
            status=400,
        )
    if not SEARCHABLE_TOKEN.search(query):
        return JsonResponse(
            {
                "detail": (
                    "Wpisz przynajmniej jedno słowo mające co najmniej "
                    f"{MIN_TOKEN_LENGTH} znaki."
                )
            },
            status=400,
        )

    relevance = RawSQL(
        "MATCH(comment) AGAINST (%s IN NATURAL LANGUAGE MODE)",
        [query],
        output_field=FloatField(),
    )
    reviews = (
        Review.objects.select_related("restaurant", "author")
        .exclude(comment="")
        .annotate(relevance=relevance)
        .filter(relevance__gt=0)
        .order_by("-relevance", "-updated_at")[:MAX_RESULTS]
    )

    results = [search_result_payload(review) for review in reviews]
    return JsonResponse(
        {
            "query": query,
            "count": len(results),
            "results": results,
        }
    )
