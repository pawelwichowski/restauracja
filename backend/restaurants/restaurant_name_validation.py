from .models import Restaurant


MIN_RESTAURANT_NAME_LENGTH = 2
MAX_RESTAURANT_NAME_LENGTH = 150


def validate_restaurant_name(value, exclude_restaurant_id=None):
    name = str(value or "").strip()

    if len(name) < MIN_RESTAURANT_NAME_LENGTH:
        raise ValueError("Nazwa restauracji musi mieć co najmniej 2 znaki.")
    if len(name) > MAX_RESTAURANT_NAME_LENGTH:
        raise ValueError("Nazwa restauracji jest zbyt długa.")

    queryset = Restaurant.objects.filter(name__iexact=name)
    if exclude_restaurant_id is not None:
        queryset = queryset.exclude(pk=exclude_restaurant_id)

    if queryset.exists():
        raise ValueError("Restauracja o tej nazwie już istnieje. Wybierz inną nazwę.")

    return name
