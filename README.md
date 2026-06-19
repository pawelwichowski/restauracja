# Smacznie

Smacznie to portal do przeglądania i oceniania restauracji. Projekt został wykonany na przedmiot **Aplikacje internetowe**.

## Technologie

- frontend: React + Vite,
- backend: Django,
- baza danych: MySQL,
- wyszukiwanie lokalizacji: OpenStreetMap / Nominatim.

## Funkcje

- przeglądanie restauracji,
- filtrowanie po nazwie, kuchni, ocenie i lokalizacji,
- wyszukiwanie restauracji w pobliżu wybranego adresu,
- rejestracja, logowanie i reset hasła w środowisku lokalnym,
- dodawanie, edycja i usuwanie własnych restauracji,
- dodawanie, edycja i usuwanie własnych opinii,
- automatyczne liczenie średniej oceny restauracji,
- wyszukiwanie pełnotekstowe w komentarzach,
- walidacja unikalnej nazwy restauracji.

## Uruchomienie

Przed uruchomieniem skonfiguruj połączenie z MySQL w pliku `backend/.env`.

### Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Backend będzie dostępny pod adresem `http://127.0.0.1:8000`.

### Frontend

W drugim terminalu, w katalogu głównym projektu:

```bash
npm install
npm run dev
```

Frontend będzie dostępny pod adresem pokazanym przez Vite, zwykle `http://localhost:5173`.

## Dane demonstracyjne i zarządzanie danymi

Dane przykładowe opinii można dodać poleceniami:

```bash
cd backend
source .venv/bin/activate
python manage.py seed_demo_reviews
python manage.py seed_demo_comments
```

Interaktywny panel do podglądu użytkowników i restauracji, ustawiania haseł testowych oraz usuwania danych uruchomisz poleceniem:

```bash
python manage.py manage_data
```
