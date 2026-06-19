from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def app_config(request):
    return JsonResponse(
        {
            "restaurant_photo_required": settings.RESTAURANT_PHOTO_REQUIRED,
        }
    )
