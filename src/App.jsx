import { useEffect, useState } from "react";

const initialFilters = {
  name: "",
  cuisine: "Wszystkie",
  minimumRating: "0",
  sort: "rating-desc",
};

const formatRating = (rating) => Number(rating).toFixed(1).replace(".", ",");

const resultLabel = (count) => {
  if (count === 1) return "1 restauracja";
  if (count >= 2 && count <= 4) return `${count} restauracje`;
  return `${count} restauracji`;
};

export default function App() {
  const [filters, setFilters] = useState(initialFilters);
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const url = new URL("/api/restaurants", window.location.origin);

    if (filters.name.trim()) url.searchParams.set("name", filters.name.trim());
    if (filters.cuisine !== "Wszystkie") url.searchParams.set("cuisine", filters.cuisine);
    url.searchParams.set("min_rating", filters.minimumRating);
    url.searchParams.set("sort", filters.sort);

    setLoading(true);
    setError("");

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.detail || "Nie udało się pobrać restauracji.");
        }
        return response.json();
      })
      .then((payload) => {
        setRestaurants(payload.results);
        setCuisines(payload.available_cuisines);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
          setRestaurants([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [filters]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const resetFilters = () => setFilters(initialFilters);
  const cuisineOptions = ["Wszystkie", ...cuisines];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Smacznie</span>
        </a>
        <span className="stage-label">Etap 2 · Django i MySQL</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">Portal z ocenami restauracji</p>
          <h1 id="page-title">Znajdź miejsce na dobry posiłek</h1>
          <p>
            Restauracje, kuchnie i oceny są teraz pobierane z API Django oraz bazy MySQL.
          </p>
        </section>

        <section className="content-layout" aria-label="Wyszukiwanie restauracji">
          <aside className="filters-panel">
            <div>
              <p className="eyebrow">Filtry</p>
              <h2>Wybierz, czego szukasz</h2>
            </div>

            <form className="filters-form" onSubmit={(event) => event.preventDefault()}>
              <label>
                Nazwa restauracji
                <input
                  name="name"
                  type="search"
                  value={filters.name}
                  onChange={updateFilter}
                  placeholder="np. ramen"
                />
              </label>

              <label>
                Rodzaj kuchni
                <select name="cuisine" value={filters.cuisine} onChange={updateFilter}>
                  {cuisineOptions.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Minimalna ocena
                <select
                  name="minimumRating"
                  value={filters.minimumRating}
                  onChange={updateFilter}
                >
                  <option value="0">Dowolna</option>
                  <option value="4">4,0 i więcej</option>
                  <option value="4.5">4,5 i więcej</option>
                  <option value="4.7">4,7 i więcej</option>
                </select>
              </label>

              <label>
                Sortowanie
                <select name="sort" value={filters.sort} onChange={updateFilter}>
                  <option value="rating-desc">Najwyższa ocena</option>
                  <option value="rating-asc">Najniższa ocena</option>
                  <option value="name-asc">Nazwa A–Z</option>
                </select>
              </label>

              <button className="secondary-button" type="button" onClick={resetFilters}>
                Wyczyść filtry
              </button>
            </form>
          </aside>

          <section className="results-section" aria-live="polite">
            <div className="results-heading">
              <div>
                <p className="eyebrow">Wyniki</p>
                <h2>{resultLabel(restaurants.length)}</h2>
              </div>
              <p>Filtry są wykonywane w bazie danych przez Django ORM.</p>
            </div>

            {loading ? (
              <div className="empty-state">
                <h3>Wczytywanie restauracji…</h3>
                <p>Łączenie z API Django.</p>
              </div>
            ) : error ? (
              <div className="empty-state">
                <h3>Nie można połączyć się z API</h3>
                <p>{error}</p>
                <p>Uruchom Django na porcie 8000 i sprawdź konfigurację MySQL.</p>
              </div>
            ) : restaurants.length > 0 ? (
              <div className="restaurant-grid">
                {restaurants.map((restaurant) => (
                  <article className="restaurant-card" key={restaurant.id}>
                    <div className="card-topline">
                      <span className="cuisine-badge">{restaurant.cuisines.join(", ")}</span>
                      <span className="price-level">Dane z MySQL</span>
                    </div>

                    <div className="card-content">
                      <h3>{restaurant.name}</h3>
                      <p className="address">{restaurant.address}</p>
                      <p className="description">{restaurant.description}</p>
                    </div>

                    <footer className="rating-row">
                      <div>
                        <span className="star" aria-hidden="true">★</span>
                        <strong>{formatRating(restaurant.average_rating)}</strong>
                        <span className="review-count">({restaurant.review_count} opinii)</span>
                      </div>
                      <button className="details-button" type="button">
                        Szczegóły
                      </button>
                    </footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <h3>Nie znaleziono restauracji</h3>
                <p>Zmień kryteria wyszukiwania albo wyczyść filtry.</p>
                <button className="primary-button" type="button" onClick={resetFilters}>
                  Pokaż wszystkie restauracje
                </button>
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className="footer">
        Projekt zaliczeniowy · Aplikacje internetowe · Etap 2
      </footer>
    </div>
  );
}
