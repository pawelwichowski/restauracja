# Smacznie — portal z ocenami restauracji

Projekt zaliczeniowy z przedmiotu **Aplikacje internetowe**.

## Etap 7 — dodawanie restauracji ze zdjęciem

Aplikacja składa się z Reacta, Django i MySQL. Gość może przeglądać restauracje i miejsca w pobliżu symulowanej lokalizacji. Zalogowany użytkownik może dodać nową restaurację wraz z adresem, pozycją geograficzną, rodzajami kuchni oraz zdjęciem.

```text
React + Vite -> Django API / Django ORM -> MySQL
                    |
                    +-> backend/media/restaurants/ (lokalne zdjęcia w trybie DEBUG)
```

### Zaimplementowane funkcje

- lista restauracji z filtrowaniem po nazwie, kuchni, ocenie i odległości,
- symulowane pozycje użytkownika w Poznaniu oraz promień wyszukiwania,
- rejestracja, logowanie, wylogowanie oraz reset hasła przez link wypisywany w terminalu Django,
- dodawanie restauracji tylko przez zalogowanego użytkownika,
- zapis właściciela restauracji w bazie,
- formularz nowej restauracji: nazwa, adres, szerokość i długość geograficzna, opis, rodzaje kuchni i zdjęcie,
- wybór co najmniej jednego rodzaju kuchni,
- upload JPG, PNG albo WebP do 5 MB,
- walidacja, czy przesłany plik jest rzeczywistym obrazem,
- lokalne przechowywanie zdjęć w `backend/media/restaurants/`,
- prezentowanie zdjęć na kartach restauracji,
- Django Admin z widocznym właścicielem restauracji.

## Wymagania

- Node.js 20.19+ albo 22.12+,
- Python 3.10+,
- MySQL 8+ albo MariaDB,
- Pillow — instaluje się automatycznie z `backend/requirements.txt`.

## Uruchomienie po pobraniu etapu 7

### Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Migracja `0002_restaurant_owner_photo` doda do tabeli restauracji właściciela i ścieżkę do pliku zdjęcia.

Przykładowa konfiguracja `backend/.env`:

```env
MYSQL_DATABASE=restauracje_db
MYSQL_USER=restauracja_app
MYSQL_PASSWORD=twoje_lokalne_haslo
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
FRONTEND_URL=http://localhost:5173
```

### Frontend

W drugim terminalu, w głównym katalogu projektu:

```bash
npm install
npm run dev
```

Vite przekazuje `/api` i `/media` do Django, dlatego zdjęcia dodane lokalnie będą wyświetlały się na stronie pod `http://localhost:5173`.

## Dodawanie restauracji

1. Załóż konto albo zaloguj się.
2. W nagłówku kliknij **Dodaj restaurację**.
3. Wpisz nazwę i adres.
4. Podaj współrzędne. Dla testu możesz użyć np. Starego Rynku:

```text
Szerokość: 52.408431
Długość: 16.934216
```

5. Zaznacz co najmniej jeden rodzaj kuchni.
6. Wybierz zdjęcie JPG, PNG albo WebP o rozmiarze do 5 MB.
7. Kliknij **Dodaj restaurację**.

Po powodzeniu okno formularza zamknie się, na stronie pojawi się komunikat sukcesu, a lista restauracji odświeży się automatycznie.

## API

### Pobieranie restauracji

```text
GET /api/restaurants
GET /api/restaurants/nearby
```

### Tworzenie restauracji

```text
POST /api/restaurants
Content-Type: multipart/form-data
```

Wymagane pola formularza:

```text
name
address
latitude
longitude
cuisine_names  # JSON, np. ["Polska", "Włoska"]
photo
```

Pole opcjonalne:

```text
description
```

Endpoint wymaga zalogowanej sesji Django i tokenu CSRF. React obsługuje oba elementy automatycznie.

## Reset hasła w wersji lokalnej

Po wybraniu opcji **Nie pamiętam hasła**, Django nie wysyła prawdziwego e-maila. Pełna treść wiadomości z jednorazowym linkiem resetu pojawia się w terminalu uruchomionym przez:

```bash
python manage.py runserver
```

## Panel administracyjny

```bash
cd backend
source .venv/bin/activate
python manage.py createsuperuser
```

Następnie otwórz `http://127.0.0.1:8000/admin/`.

## Kolejne etapy

- szczegół restauracji i lista komentarzy,
- wystawianie jednej opinii przez użytkownika dla restauracji,
- usuwanie własnej restauracji,
- wyszukiwanie pełnotekstowe komentarzy.
