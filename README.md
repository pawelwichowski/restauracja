# Smacznie — portal z ocenami restauracji

Projekt zaliczeniowy z przedmiotu **Aplikacje internetowe**.

## Etap 6 — konta użytkowników i reset hasła

Aplikacja ma frontend React i backend Django. Lista restauracji jest pobierana z API Django, które korzysta z MySQL przez Django ORM. Gość może wyświetlić lokale w pobliżu symulowanej pozycji, a użytkownik może założyć konto, zalogować się oraz zresetować hasło.

```text
React + Vite  ->  Django API  ->  Django ORM  ->  MySQL
                           |
                           +-> console.EmailBackend (terminal podczas developmentu)
```

### Zaimplementowane funkcje

- przechowywanie restauracji oraz rodzajów kuchni w MySQL,
- relacja wiele-do-wielu: restauracja — rodzaj kuchni,
- filtrowanie po nazwie, kuchni, ocenie i odległości,
- trzy symulowane lokalizacje w Poznaniu i promień od 500 m do 5 km,
- obliczanie odległości przez MySQL według wzoru Haversine'a,
- rejestracja użytkownika z nazwą, e-mailem i hasłem,
- logowanie nazwą użytkownika albo e-mailem,
- wylogowanie z sesji Django,
- hasła przechowywane jako hashe przez Django,
- walidacja haseł Django: długość, zbyt proste hasła i podobieństwo do danych użytkownika,
- ochrona żądań modyfikujących przed CSRF,
- reset hasła przez jednorazowy link oparty na tokenie Django,
- w trybie lokalnym wiadomość resetująca jest wypisywana w terminalu backendu, bez faktycznej wysyłki e-maila,
- panel Django Admin do podglądu danych.

> Na tym etapie `average_rating` i `review_count` są zapisanymi danymi demonstracyjnymi. W etapie z opiniami zostaną zastąpione mechanizmem ocen wystawianych przez użytkowników.

## Wymagania

- Node.js 20.19+ albo 22.12+,
- Python 3.10+,
- uruchomiony lokalnie MySQL 8+ lub MariaDB,
- konto MySQL, którego używasz na laboratoriach.

## Pierwsze uruchomienie

### 1. Utwórz bazę

W MySQL Workbench, phpMyAdmin albo konsoli MySQL utwórz bazę o nazwie `restauracje_db` z kodowaniem `utf8mb4`. Do pliku `.env` wpiszesz później dane swojego lokalnego użytkownika MySQL.

### 2. Uruchom backend

W terminalu, w katalogu projektu:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Otwórz `backend/.env` i ustaw rzeczywiste dane logowania:

```env
MYSQL_DATABASE=restauracje_db
MYSQL_USER=restauracja_app
MYSQL_PASSWORD=twoje_lokalne_haslo
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
FRONTEND_URL=http://localhost:5173
```

Następnie wykonaj migracje, dodaj dane startowe i uruchom Django:

```bash
python manage.py migrate
python manage.py seed_restaurants
python manage.py runserver
```

Backend będzie działał pod `http://127.0.0.1:8000`.

### 3. Uruchom frontend

W drugim terminalu, w katalogu głównym repozytorium:

```bash
npm install
npm run dev
```

Otwórz adres pokazany przez Vite, zazwyczaj `http://localhost:5173`.

## Test rejestracji i resetu hasła

1. Kliknij **Załóż konto** i zarejestruj użytkownika.
2. Wyloguj się.
3. Kliknij **Zaloguj się**, a następnie **Nie pamiętam hasła**.
4. Wpisz e-mail konta i zatwierdź.
5. Spójrz do terminala, w którym działa `python manage.py runserver`. Django wypisze wiadomość podobną do:

```text
Subject: Reset hasła — Smacznie
To: twoj-email@example.com

Otrzymaliśmy prośbę o zmianę hasła do konta Smacznie.

Aby ustawić nowe hasło, otwórz jednorazowy link:
http://localhost:5173/reset-hasla/<uid>/<token>
```

6. Otwórz ten link w przeglądarce.
7. Ustaw nowe hasło i zaloguj się nim.

Link jest jednorazowy: po zmianie hasła token przestaje działać. Interfejs celowo pokazuje taki sam komunikat także dla nieistniejącego e-maila, aby nie zdradzać, które adresy mają konta.

## API

### Restauracje

```text
GET /api/restaurants
GET /api/restaurants/nearby
```

Przykład restauracji do 2 km od Starego Rynku:

```text
http://127.0.0.1:8000/api/restaurants/nearby?latitude=52.408431&longitude=16.934216&radius_km=2&sort=distance-asc
```

### Konta

```text
GET  /api/auth/csrf
GET  /api/auth/me
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/password-reset
POST /api/auth/password-reset/confirm
```

Frontend korzysta z tych endpointów automatycznie. Endpointy POST wymagają tokenu CSRF, który React pobiera z `/api/auth/csrf`.

## Panel administracyjny Django

Po utworzeniu administratora:

```bash
cd backend
source .venv/bin/activate
python manage.py createsuperuser
```

wejdź na `http://127.0.0.1:8000/admin/`.

## Kolejny etap

- dodawanie restauracji przez zalogowanego użytkownika,
- model opinii z ograniczeniem jednej oceny na użytkownika i restaurację,
- zdjęcia restauracji,
- szczegóły restauracji i komentarze,
- pełnotekstowe wyszukiwanie komentarzy.
