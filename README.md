# Smacznie — portal z ocenami restauracji

Projekt zaliczeniowy z przedmiotu **Aplikacje internetowe**.

## Etap 3

Aplikacja ma frontend React i backend Django. Lista restauracji jest pobierana z API Django, które korzysta z MySQL przez Django ORM. Gość może też wyświetlić restauracje w pobliżu symulowanej pozycji użytkownika.

```text
React + Vite  ->  Django API  ->  Django ORM / obliczenie odległości  ->  MySQL
```

### Zaimplementowane funkcje

- przechowywanie restauracji oraz rodzajów kuchni w MySQL,
- relacja wiele-do-wielu: restauracja — rodzaj kuchni,
- endpoint `GET /api/restaurants`,
- endpoint `GET /api/restaurants/nearby`,
- filtrowanie po nazwie, kuchni i minimalnej ocenie po stronie backendu,
- filtrowanie restauracji w promieniu od symulowanej lokalizacji użytkownika,
- trzy symulowane lokalizacje w Poznaniu: Stary Rynek, Dworzec Główny i Rynek Jeżycki,
- wybór promienia od 500 m do 5 km,
- obliczanie odległości przez MySQL według wzoru Haversine'a,
- zwracanie i prezentowanie odległości restauracji w kilometrach lub metrach,
- łączenie filtra odległości z nazwą, kuchnią i minimalną oceną,
- sortowanie po nazwie, ocenie lub odległości,
- dane startowe ładowane komendą Django,
- panel Django Admin do podglądu i edycji rekordów,
- proxy Vite, dzięki któremu React komunikuje się z Django lokalnie bez dodatkowej konfiguracji CORS.

> Na tym etapie `average_rating` i `review_count` są zapisanymi danymi demonstracyjnymi. W etapie z kontami i opiniami zostaną zastąpione mechanizmem ocen wystawianych przez użytkowników.

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

Otwórz `backend/.env` i ustaw rzeczywiste dane logowania, na przykład:

```env
MYSQL_DATABASE=restauracje_db
MYSQL_USER=restauracja_app
MYSQL_PASSWORD=twoje_lokalne_haslo
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
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

## API

### Pełna lista restauracji

```text
GET /api/restaurants
```

Obsługiwane parametry opcjonalne:

```text
name=ramen
cuisine=Polska
min_rating=4.5
sort=rating-desc | rating-asc | name-asc
```

### Restauracje w pobliżu

```text
GET /api/restaurants/nearby
```

Dla tego endpointu wymagane są parametry lokalizacji:

```text
latitude=52.408431
longitude=16.934216
radius_km=2
```

Możesz dodatkowo łączyć je z istniejącymi filtrami i sortowaniem:

```text
name=ramen
cuisine=Japońska
min_rating=4
sort=distance-asc
```

Przykład — restauracje do 2 km od Starego Rynku:

```text
http://127.0.0.1:8000/api/restaurants/nearby?latitude=52.408431&longitude=16.934216&radius_km=2&sort=distance-asc
```

Odpowiedź zawiera dodatkowo pole `distance_km` dla każdej znalezionej restauracji.

## Panel administracyjny Django

Po utworzeniu administratora:

```bash
cd backend
source .venv/bin/activate
python manage.py createsuperuser
```

wejdź na `http://127.0.0.1:8000/admin/`. Możesz tam przeglądać, dodawać i edytować restauracje oraz rodzaje kuchni.

## Kolejny etap

- rejestracja, logowanie i reset hasła,
- dodawanie restauracji przez użytkownika,
- model opinii użytkownika z ograniczeniem jednej oceny na restaurację,
- zdjęcia restauracji,
- szczegóły restauracji i komentarze,
- wyszukiwanie pełnotekstowe komentarzy.
