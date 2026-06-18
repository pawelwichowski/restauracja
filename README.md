# Smacznie — portal z ocenami restauracji

Projekt zaliczeniowy z przedmiotu **Aplikacje internetowe**.

## Etap 11 — pełnotekstowe wyszukiwanie komentarzy

Aplikacja wykorzystuje React, Django i MySQL. Gość może przeglądać restauracje, natomiast zalogowany użytkownik może dodawać restauracje, wystawiać opinie oraz wyszukiwać tekst opublikowanych komentarzy.

```text
React + Vite -> Django API / Django ORM -> MySQL
                                      |
                                      +-> FULLTEXT INDEX restaurants_review(comment)
```

### Zaimplementowane funkcje

- lista restauracji z filtrowaniem po nazwie, kuchni, minimalnej ocenie i odległości,
- progi minimalnej oceny: od 1,0 do 5,0 co 0,5,
- rejestracja, logowanie, wylogowanie oraz reset hasła w trybie lokalnym,
- dodawanie restauracji ze zdjęciem przez zalogowanego użytkownika,
- jedna opinia użytkownika na restaurację, z oceną 1–5 i opcjonalnym komentarzem,
- edycja/usuwanie własnej opinii oraz własnej restauracji z potwierdzeniem usuwania,
- automatyczne przeliczanie średniej oceny i liczby opinii,
- **pełnotekstowe wyszukiwanie komentarzy** dostępne tylko po zalogowaniu,
- indeks MySQL `FULLTEXT` na kolumnie `Review.comment`,
- wyszukiwanie przez `MATCH(comment) AGAINST(... IN NATURAL LANGUAGE MODE)`,
- wyniki sortowane według trafności i ograniczone do 50,
- kliknięcie wyniku otwiera szczegóły wskazanej restauracji.

## Uruchomienie po pobraniu etapu 11

### Backend

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Migracja `0004_review_comment_fulltext` tworzy indeks:

```sql
CREATE FULLTEXT INDEX review_comment_fulltext
ON restaurants_review (comment);
```

Nie uruchamiaj `makemigrations`, ponieważ migracja jest już w repozytorium.

### Frontend

W drugim terminalu, w katalogu głównym projektu:

```bash
npm install
npm run dev
```

## Testowanie wyszukiwania pełnotekstowego

1. Zaloguj się.
2. W nagłówku kliknij **Szukaj komentarzy**.
3. Wpisz frazę, np. `ramen`, `pizza`, `obsługa`, `curry` lub `atmosfera`.
4. Kliknij wynik, aby otworzyć szczegóły restauracji i pełną listę jej opinii.

MySQL zwykle nie indeksuje słów krótszych niż 3 znaki, dlatego API i formularz wymagają przynajmniej jednego słowa mającego co najmniej 3 znaki.

### Opcjonalne dane komentarzy do demonstracji

Wcześniejszy seed ocen celowo dodaje opinie bez komentarzy. Aby dodać kilka kontrolowanych komentarzy testowych, wykonaj kolejno:

```bash
cd backend
source .venv/bin/activate
python manage.py seed_demo_reviews
python manage.py seed_demo_comments
```

Druga komenda dodaje lub aktualizuje sześć komentarzy przykładowych. Nie tworzy dodatkowych opinii ani nie zmienia ocen. Obie komendy są bezpieczne do ponownego uruchomienia.

## API

### Restauracje

```text
GET    /api/restaurants
GET    /api/restaurants/nearby
GET    /api/restaurants/<restaurant_id>
POST   /api/restaurants
POST   /api/restaurants/<restaurant_id>/edit
DELETE /api/restaurants/<restaurant_id>/delete
```

### Opinie

```text
POST   /api/restaurants/<restaurant_id>/reviews
PATCH  /api/reviews/<review_id>
DELETE /api/reviews/<review_id>/delete
GET    /api/reviews/search?q=<fraza>
```

Endpoint `GET /api/reviews/search` wymaga zalogowanej sesji. Przykład:

```text
http://127.0.0.1:8000/api/reviews/search?q=ramen
```

## Reset hasła w wersji lokalnej

Po opcji **Nie pamiętam hasła** Django nie wysyła prawdziwego e-maila. Pełna wiadomość z jednorazowym linkiem resetu pojawia się w terminalu `python manage.py runserver`.

## Panel administracyjny

```bash
cd backend
source .venv/bin/activate
python manage.py createsuperuser
```

Następnie otwórz `http://127.0.0.1:8000/admin/`.
