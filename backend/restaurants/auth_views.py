import json
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST


def user_payload(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
    }


def parse_json_body(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise ValueError("Nieprawidłowy format danych.")

    if not isinstance(payload, dict):
        raise ValueError("Nieprawidłowy format danych.")

    return payload


def validation_message(error):
    if hasattr(error, "messages"):
        return " ".join(error.messages)
    return str(error)


def validate_registration_data(payload):
    username = str(payload.get("username", "")).strip()
    email = User.objects.normalize_email(str(payload.get("email", "")).strip()).lower()
    password = str(payload.get("password", ""))
    password_confirmation = str(payload.get("passwordConfirmation", ""))

    if len(username) < 3:
        raise ValueError("Nazwa użytkownika musi mieć co najmniej 3 znaki.")

    if len(username) > 150:
        raise ValueError("Nazwa użytkownika jest zbyt długa.")

    if User.objects.filter(username__iexact=username).exists():
        raise ValueError("Ta nazwa użytkownika jest już zajęta.")

    try:
        validate_email(email)
    except ValidationError as error:
        raise ValueError("Podaj poprawny adres e-mail.") from error

    if User.objects.filter(email__iexact=email).exists():
        raise ValueError("Konto z tym adresem e-mail już istnieje.")

    if password != password_confirmation:
        raise ValueError("Hasła nie są takie same.")

    candidate = User(username=username, email=email)
    try:
        validate_password(password, candidate)
    except ValidationError as error:
        raise ValueError(validation_message(error)) from error

    return username, email, password


@require_GET
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False})

    return JsonResponse({"authenticated": True, "user": user_payload(request.user)})


@require_POST
def register(request):
    try:
        username, email, password = validate_registration_data(parse_json_body(request))
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    login(request, user)

    return JsonResponse({"user": user_payload(user)}, status=201)


@require_POST
def sign_in(request):
    try:
        payload = parse_json_body(request)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    identity = str(payload.get("identity", "")).strip()
    password = str(payload.get("password", ""))

    if not identity or not password:
        return JsonResponse({"detail": "Podaj nazwę użytkownika lub e-mail oraz hasło."}, status=400)

    username = identity
    if "@" in identity:
        matching_user = User.objects.filter(email__iexact=identity).first()
        username = matching_user.username if matching_user else ""

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Nieprawidłowa nazwa użytkownika, e-mail lub hasło."}, status=401)

    login(request, user)
    return JsonResponse({"user": user_payload(user)})


@require_POST
def sign_out(request):
    logout(request)
    return JsonResponse({"detail": "Wylogowano."})


@require_POST
def password_reset_request(request):
    try:
        payload = parse_json_body(request)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    email = User.objects.normalize_email(str(payload.get("email", "")).strip()).lower()
    try:
        validate_email(email)
    except ValidationError:
        return JsonResponse({"detail": "Podaj poprawny adres e-mail."}, status=400)

    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user is not None:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-hasla/{quote(uid)}/{quote(token)}"
        message = (
            "Otrzymaliśmy prośbę o zmianę hasła do konta Smacznie.\n\n"
            "Aby ustawić nowe hasło, otwórz jednorazowy link:\n"
            f"{reset_url}\n\n"
            "Jeśli nie wysyłałeś tej prośby, zignoruj tę wiadomość."
        )
        send_mail(
            subject="Reset hasła — Smacznie",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

    return JsonResponse(
        {
            "detail": (
                "Jeśli konto z tym adresem istnieje, instrukcja zmiany hasła "
                "została wypisana w terminalu backendu."
            )
        }
    )


@require_POST
def password_reset_confirm(request):
    try:
        payload = parse_json_body(request)
    except ValueError as error:
        return JsonResponse({"detail": str(error)}, status=400)

    uid = str(payload.get("uid", ""))
    token = str(payload.get("token", ""))
    password = str(payload.get("password", ""))
    password_confirmation = str(payload.get("passwordConfirmation", ""))

    if password != password_confirmation:
        return JsonResponse({"detail": "Hasła nie są takie same."}, status=400)

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None

    if user is None or not default_token_generator.check_token(user, token):
        return JsonResponse(
            {"detail": "Link resetujący jest nieprawidłowy albo wygasł."},
            status=400,
        )

    try:
        validate_password(password, user)
    except ValidationError as error:
        return JsonResponse({"detail": validation_message(error)}, status=400)

    user.set_password(password)
    user.save(update_fields=["password"])

    return JsonResponse({"detail": "Hasło zostało zmienione. Możesz się zalogować."})
