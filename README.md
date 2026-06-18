# Smacznie — portal z ocenami restauracji

Projekt zaliczeniowy z przedmiotu **Aplikacje internetowe**.

## Etap 8 — opinie, edycja i usuwanie własnych danych

Aplikacja składa się z Reacta, Django i MySQL. Gość może przeglądać restauracje oraz miejsca w pobliżu symulowanej lokalizacji. Zalogowany użytkownik może dodać restaurację, jednorazowo opublikować dla niej opinię, a następnie edytować albo usunąć wyłącznie własne dane.

```text
React + Vite -> Django API / Django ORM -> MySQL
                    |
                    +-> backend/media/restaurants/ (lokalne zdjęcia w trybie DEBUG)
```

### Zaimplementowane funkcje

- lista restauracji z filtrowaniem po nazwie, kuchni, ocenie i odległości,
- symulowane lokalizacje użytkownika w Poznaniu oraz promień wyszukiwania,
- rejestracja, logowanie, wylogowanie oraz reset hasła przez link wypisywany w terminalu Django,
- dodawanie restauracji tylko przez zalogowanego użytkownika,
- zdjęcia restauracji i zapis właściciela rekordu,
- szczegóły restauracji z listą opinii,
- opinia: obowiązkowa ocena od 1 do 5 oraz opcjonalny komentarz do 2000 znaków,
- ograniczenie w bazie danych: **jedna opinia użytkownika dla jednej restauracji**,
- edycja i usuwanie wyłącznie własnej opinii,
- edycja i usuwanie wyłącznie własnej restauracji,
- dialog potwierdzenia przed każdą nieodwracalną operacją usunięcia,
- automatyczne przeliczenie średniej oceny i liczby opinii po dodaniu, zmianie lub usunięciu opinii,
- blokady transakcyjne i constraint `UNIQUE(restaurant, author)` zabezpieczające opinię przed podwójnym utworzeniem przy równoczesnych żądaniach,
- Django Admin dla restauracji, kuchni i opinii.

## Wymagania

- Node.js 20.19+ albo 22.12+,
- Python 3.10+,
- MySQL 8+ albo MariaDB,
- Pillow — instalowane z `backend/requirements.txt`.

## Uruchomienie po pobraniu etapu 8

Najpierw zmerguj etap 7, ponieważ etap 8 jest oparty na jego modelu restauracji ze zdjęciem i właścicielem.

### Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Migracja `0003_review` tworzy tabelę opinii oraz dwa ograniczenia:

```text
UNIQUE(restaurant_id, author_id)
CHECK(rating BETWEEN 1 AND 5)
```

Nie uruchamiaj `makemigrations`, ponieważ migracja jest już w repozytorium.

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

W drugim terminalu, w katalogu głównym projektu:

```bash
npm install
npm run dev
```

## Testowanie opinii

1. Załóż konto A i otwórz szczegóły wybranej restauracji przyciskiem **Szczegóły**.
2. Wybierz ocenę od 1 do 5, opcjonalnie wpisz komentarz i kliknij **Opublikuj opinię**.
3. Sprawdź, czy średnia oraz licznik opinii na liście zmieniły się automatycznie.
4. W szczegółach tej samej restauracji zobaczysz przyciski **Edytuj opinię** oraz **Usuń opinię** zamiast drugiego formularza dodawania.
5. Kliknij **Usuń opinię**. Pojawi się dodatkowe okno potwierdzenia; dopiero jego czerwony przycisk wykonuje nieodwracalne usunięcie.
6. Załóż konto B i sprawdź, że konto B może utworzyć własną opinię, ale nie ma przycisków edycji/usuwania opinii konta A.

## Testowanie zarządzania restauracją

1. Zaloguj się jako użytkownik, który utworzył restaurację w etapie 7.
2. Otwórz jej szczegóły.
3. Pojawią się akcje **Edytuj restaurację** i **Usuń restaurację**.
4. W edycji można zmienić nazwę, adres, współrzędne, opis, kuchnie i opcjonalnie zdjęcie. Bez wyboru nowego pliku stare zdjęcie zostanie zachowane.
5. Usunięcie wymaga potwierdzenia; usuwa restaurację oraz powiązane opinie i jest nieodwracalne.
6. Użytkownik, który nie jest właścicielem restauracji, nie zobaczy tych przycisków, a backend i tak zwróci `403`, gdyby próbował wywołać endpoint ręcznie.

## API

### Restauracje

```text
GET  /api/restaurants
GET  /api/restaurants/nearby
GET  /api/restaurants/<restaurant_id>
POST /api/restaurants
POST /api/restaurants/<restaurant_id>/edit
DELETE /api/restaurants/<restaurant_id>/delete
```

`POST /api/restaurants/<restaurant_id>/edit` używa `multipart/form-data`, ponieważ może zawierać nowe zdjęcie.

### Opinie

```text
POST   /api/restaurants/<restaurant_id>/reviews
PATCH  /api/reviews/<review_id>
DELETE /api/reviews/<review_id>/delete
```

Przykładowe body dla utworzenia lub edycji opinii:

```json
{
  "rating": 5,
  "comment": "Bardzo dobry ramen i szybka obsługa."
}
```

Wszystkie mutujące endpointy wymagają zalogowanej sesji Django oraz tokenu CSRF. React pobiera i wysyła token automatycznie.

## Reset hasła w wersji lokalnej

Po opcji **Nie pamiętam hasła** Django nie wysyła prawdziwego e-maila. Pełna wiadomość z jednorazowym linkiem resetu pojawia się w terminalu uruchomionym przez:

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

- wyszukiwanie pełnotekstowe komentarzy,
- dodatkowe zdjęcia restauracji,
- publikacja aplikacji i przejście z lokalnego magazynu mediów na produkcyjny storage.
