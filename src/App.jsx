import { useMemo, useState } from "react";
import { restaurants } from "./data/restaurants.js";

const initialFilters = {
  name: "",
  cuisine: "Wszystkie",
  minimumRating: "0",
  sort: "rating-desc",
};

const formatRating = (rating) => rating.toFixed(1).replace(".", ",");

export default function App() {
  const [filters, setFilters] = useState(initialFilters);

  const cuisines = useMemo(
    () => ["Wszystkie", ...new Set(restaurants.map((restaurant) => restaurant.cuisine))],
    [],
  );

  const filteredRestaurants = useMemo(() => {
    const normalizedName = filters.name.trim().toLocaleLowerCase("pl-PL");
    const minimumRating = Number(filters.minimumRating);

    return restaurants
      .filter((restaurant) => {
        const matchesName = restaurant.name
          .toLocaleLowerCase("pl-PL")
          .includes(normalizedName);
        const matchesCuisine =
          filters.cuisine === "Wszystkie" || restaurant.cuisine === filters.cuisine;
        const matchesRating = restaurant.rating >= minimumRating;

        return matchesName && matchesCuisine && matchesRating;
      })
      .sort((first, second) => {
        if (filters.sort === "name-asc") {
          return first.name.localeCompare(second.name, "pl-PL");
        }

        if (filters.sort === "rating-asc") {
          return first.rating - second.rating || first.name.localeCompare(second.name, "pl-PL");
        }

        return second.rating - first.rating || first.name.localeCompare(second.name, "pl-PL");
      });
  }, [filters]);

  const updateFilter = (event) => {
    const { name, value } = event.target;
    setFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const resetFilters = () => setFilters(initialFilters);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" onClick={(event) => event.preventDefault()}>
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Smacznie</span>
        </a>
        <span className="stage-label">Etap 1 · lista restauracji</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">Portal z ocenami restauracji</p>
          <h1 id="page-title">Znajdź miejsce na dobry posiłek</h1>
          <p>
            Przeglądaj restauracje, sprawdzaj średnie oceny i zawężaj wyniki według
            własnych kryteriów.
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
                  {cuisines.map((cuisine) => (
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
                <h2>
                  {filteredRestaurants.length === 1
                    ? "1 restauracja"
                    : `${filteredRestaurants.length} restauracji`}
                </h2>
              </div>
              <p>Ocena będzie później liczona na podstawie opinii użytkowników.</p>
            </div>

            {filteredRestaurants.length > 0 ? (
              <div className="restaurant-grid">
                {filteredRestaurants.map((restaurant) => (
                  <article className="restaurant-card" key={restaurant.id}>
                    <div className="card-topline">
                      <span className="cuisine-badge">{restaurant.cuisine}</span>
                      <span className="price-level" aria-label={`Poziom cen: ${restaurant.priceLevel}`}>
                        {restaurant.priceLevel}
                      </span>
                    </div>

                    <div className="card-content">
                      <h3>{restaurant.name}</h3>
                      <p className="address">{restaurant.address}</p>
                      <p className="description">{restaurant.description}</p>
                    </div>

                    <footer className="rating-row">
                      <div>
                        <span className="star" aria-hidden="true">★</span>
                        <strong>{formatRating(restaurant.rating)}</strong>
                        <span className="review-count">({restaurant.reviewCount} opinii)</span>
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
        Projekt zaliczeniowy · Aplikacje internetowe · Etap 1
      </footer>
    </div>
  );
}
