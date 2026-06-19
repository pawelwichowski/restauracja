from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .restaurant_name_validation import validate_restaurant_name


@require_GET
def restaurant_name_availability(request):
    exclude_id = request.GET.get("exclude_id")
    if exclude_id not in (None, ""):
        try:
            exclude_id = int(exclude_id)
        except ValueError:
            return JsonResponse({"detail": "Nieprawidłowy identyfikator restauracji."}, status=400)
    else:
        exclude_id = None

    try:
        validate_restaurant_name(
            request.GET.get("name", ""),
            exclude_restaurant_id=exclude_id,
        )
    except ValueError as error:
        return JsonResponse({"available": False, "detail": str(error)})

    return JsonResponse({"available": True, "detail": "Nazwa restauracji jest dostępna."})
