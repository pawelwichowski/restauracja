from getpass import getpass

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.db import transaction

from restaurants.models import Restaurant, Review


class Command(BaseCommand):
    help = "Interaktywny panel użytkowników i restauracji."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\nPanel zarządzania danymi Smacznie"))
        self.stdout.write(
            "Hasła jawne nie są dostępne w bazie, ponieważ Django przechowuje tylko ich hashe. "
            "W tym panelu możesz ustawić nowe hasło testowe.\n"
        )

        actions = {
            "1": self.list_users,
            "2": self.set_password,
            "3": self.delete_user,
            "4": self.list_restaurants,
            "5": self.delete_restaurant,
        }

        while True:
            self.stdout.write("\n1. Zobacz użytkowników")
            self.stdout.write("2. Ustaw hasło użytkownika")
            self.stdout.write("3. Usuń konto użytkownika")
            self.stdout.write("4. Zobacz restauracje")
            self.stdout.write("5. Usuń restaurację")
            self.stdout.write("0. Zakończ")

            choice = input("\nWybierz opcję: ").strip()
            if choice == "0":
                self.stdout.write(self.style.SUCCESS("Zakończono panel zarządzania danymi."))
                return

            action = actions.get(choice)
            if action is None:
                self.stdout.write(self.style.ERROR("Nieprawidłowa opcja."))
                continue

            try:
                action()
            except KeyboardInterrupt:
                self.stdout.write("\nOperacja została anulowana.")

    def ask_id(self, label):
        try:
            return int(input(f"{label} ID: ").strip())
        except ValueError:
            self.stdout.write(self.style.ERROR("ID musi być liczbą."))
            return None

    @staticmethod
    def confirm():
        return input("Wpisz TAK, aby potwierdzić: ").strip() == "TAK"

    def list_users(self):
        user_model = get_user_model()
        users = list(user_model.objects.order_by("id"))

        if not users:
            self.stdout.write(self.style.WARNING("Brak użytkowników."))
            return

        self.stdout.write("\nID | login | e-mail | hasło ustawione | rola | opinie | restauracje")
        self.stdout.write("-" * 110)

        for user in users:
            password_state = "tak" if user.has_usable_password() else "nie"
            reviews_count = Review.objects.filter(author=user).count()
            restaurants_count = Restaurant.objects.filter(owner=user).count()

            if user.is_superuser:
                role = "administrator"
            elif user.is_staff:
                role = "staff"
            else:
                role = "użytkownik"

            self.stdout.write(
                f"{user.id} | {user.username} | {user.email or '-'} | {password_state} | "
                f"{role} | {reviews_count} | {restaurants_count}"
            )

    def set_password(self):
        user_id = self.ask_id("Użytkownika")
        if user_id is None:
            return

        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=user_id)
        except user_model.DoesNotExist:
            self.stdout.write(self.style.ERROR("Nie znaleziono użytkownika o podanym ID."))
            return

        password = getpass(f"Nowe hasło dla {user.username}: ")
        password_confirmation = getpass("Powtórz nowe hasło: ")

        if password != password_confirmation:
            self.stdout.write(self.style.ERROR("Hasła nie są takie same."))
            return

        try:
            validate_password(password, user)
        except ValidationError as error:
            self.stdout.write(self.style.ERROR(" ".join(error.messages)))
            return

        user.set_password(password)
        user.save(update_fields=["password"])
        self.stdout.write(
            self.style.SUCCESS(f"Ustawiono nowe hasło dla użytkownika: {user.username}")
        )

    def delete_user(self):
        user_id = self.ask_id("Użytkownika do usunięcia")
        if user_id is None:
            return

        user_model = get_user_model()
        try:
            user = user_model.objects.get(pk=user_id)
        except user_model.DoesNotExist:
            self.stdout.write(self.style.ERROR("Nie znaleziono użytkownika o podanym ID."))
            return

        reviews_count = Review.objects.filter(author=user).count()
        restaurants_count = Restaurant.objects.filter(owner=user).count()

        self.stdout.write(
            self.style.WARNING(
                f"Usuwasz konto: {user.username} ({user.email or 'brak e-maila'}).\n"
                f"- zostaną usunięte opinie użytkownika: {reviews_count},\n"
                f"- restauracje dodane przez użytkownika pozostaną: {restaurants_count}, "
                "ale stracą przypisanego właściciela."
            )
        )

        if user.is_superuser:
            self.stdout.write(self.style.WARNING("Uwaga: wybrano konto administratora."))

        if not self.confirm():
            self.stdout.write("Usuwanie anulowane.")
            return

        with transaction.atomic():
            user.delete()

        self.stdout.write(self.style.SUCCESS("Konto użytkownika zostało usunięte."))

    def list_restaurants(self):
        restaurants = list(Restaurant.objects.select_related("owner").order_by("id"))

        if not restaurants:
            self.stdout.write(self.style.WARNING("Brak restauracji."))
            return

        self.stdout.write("\nID | nazwa | adres | właściciel | opinie")
        self.stdout.write("-" * 110)

        for restaurant in restaurants:
            owner = restaurant.owner.username if restaurant.owner else "brak"
            self.stdout.write(
                f"{restaurant.id} | {restaurant.name} | {restaurant.address} | "
                f"{owner} | {restaurant.review_count}"
            )

    def delete_restaurant(self):
        restaurant_id = self.ask_id("Restauracji do usunięcia")
        if restaurant_id is None:
            return

        try:
            restaurant = Restaurant.objects.get(pk=restaurant_id)
        except Restaurant.DoesNotExist:
            self.stdout.write(self.style.ERROR("Nie znaleziono restauracji o podanym ID."))
            return

        reviews_count = Review.objects.filter(restaurant=restaurant).count()
        self.stdout.write(
            self.style.WARNING(
                f"Usuwasz restaurację: {restaurant.name}.\n"
                f"Zostaną też usunięte powiązane opinie: {reviews_count}."
            )
        )

        if not self.confirm():
            self.stdout.write("Usuwanie anulowane.")
            return

        with transaction.atomic():
            restaurant.delete()

        self.stdout.write(self.style.SUCCESS("Restauracja została usunięta."))
