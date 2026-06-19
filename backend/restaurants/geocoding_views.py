import json
import threading
import time
from functools import lru_cache
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET


MAX_QUERY_LENGTH = 160
MIN_QUERY_LENGTH = 3
NOMINATIM_LIMIT = 5
NOMINATIM_MIN_INTERVAL_SECONDS = 1.0

_last_request_at = 0.0
_request_lock = threading.Lock()


def validate_query(value):
    query = value.strip()
    if len(query) < MIN_QUERY_LENGTH:
        raise ValueError("Wpisz adres zawierający co najmniej 3 znaki.")
    if len(query) > MAX_QUERY_LENGTH:
        raise ValueError(f"Adres może mieć maksymalnie {MAX_QUERY_LENGTH} znaków.")
    return query


@lru_cache(maxsize=128)
def nominatim_search(query):
    global _last_request_at

    parameters = urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "addressdetails": 1,
            "countrycodes": "pl",
            "limit": NOMINATIM_LIMIT,
        }
    )
    request = Request(
        f"{settings.NOMINATIM_URL}?{parameters}",
        headers={
            "User-Agent": settings.NOMINATIM_USER_AGENT,
            "Accept-Language": "pl",
        },
    )

    try:
        with _request_lock:
            wait_time = NOMINATIM_MIN_INTERVAL_SECONDS - (time.monotonic() - _last_request_at)
            if wait_time > 0:
                time.sleep(wait_time)

            with urlopen(request, timeout=8) as response:
                body = response.read().decode("utf-8")
            _last_request_at = time.monotonic()
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError("Usługa wyszukiwania adresów jest chwilowo niedostępna.") from error

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as error:
        raise RuntimeError("Usługa wyszukiwania adresów zwróciła nieprawidłową odpowiedź.") from error

    return tuple(
        {
            "display_name": item["display_name"],
            "latitude": float(item["lat"]),
            "longitude": float(item["lon"]),
            "osm_type": item.get("osm_type"),
            "osm_id": item.get("osm_id"),
        }
        for item in payload
        if "display_name" in item and "lat" in item and "lon" in item
    )


@require_GET
def address_search(request):
    try:
        query = validate_query(request.GET.get("q", ""))
        results = nominatim_search(query)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)
    except RuntimeError as error:
        return JsonResponse({"detail": str(error)}, status=502)

    return JsonResponse(
        {
            "query": query,
            "results": list(results),
            "attribution": "© OpenStreetMap contributors",
        }
    )
