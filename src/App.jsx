import { useEffect, useState } from "react";

const SIMULATED_LOCATIONS = [
  {
    id: "none",
    label: "Nie filtruj po lokalizacji",
  },
  {
    id: "stary-rynek",
    label: "Stary Rynek, Poznań",
    latitude: 52.408431,
    longitude: 16.934216,
  },
  {
    id: "dworzec-glowny",
    label: "Dworzec Główny, Poznań",
    latitude: 52.402429,
    longitude: 16.910797,
  },
  {
    id: "rynek-jezycki",
    label: "Rynek Jeżycki, Poznań",
    latitude: 52.408255,
    longitude: 16.898405,
  },
];

const initialFilters = {
  name: "",
  cuisine: "Wszystkie",
  minimumRating: "0",
  sort: "rating-desc",
  locationId: "none",
  radiusKm: "2",
};

const formatRating = (rating) => Number(rating).toFixed(1).replace(".", ",");

const formatDistance = (distance) => {
  if (distance < 1) return `${Math.round(distance * 1000)} m stąd`;
  return `${Number(distance).toFixed(2).replace(".", ",")} km stąd`;
};

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

  const selectedLocation = SIMULATED_LOCATIONS.find(
    (location) => location.id === filters.locationId,
  );
  const isNearbySearch = selectedLocation?.latitude !== undefined;

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = isNearbySearch ? "/api/restaurants/nearby" : "/api/restaurants";
    const url = new URL(endpoint, window.location.origin);

    if (filters.name.trim()) url.searchParams.set("name", filters.name.trim());
    if (filters.cuisine !== "Wszystkie") url.searchParams.set("cuisine", filters.cuisine);
    url.searchParams.set("min_rating", filters.minimumRating);
    url.searchParams.set("sort", filters.sort);

    if (isNearbySearch) {
      url.searchParams.set("latitude", selectedLocation.latitude);
      url.searchParams.set("longitude", selectedLocation.longitude);
      url.searchParams.set("radius_km", filters.radiusKm);
    }

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
  }, [filters, isNearbySearch, selectedLocation]);

  const updateFilter = (event) => {
    const { name, value } = event.target;

    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters, [name]: value };

      if (name === "locationId") {
        if (value === "none" && currentFilters.sort === "distance-asc") {
          nextFilters.sort = "rating-desc";
        }

        if (value !== "none") {
          nextFilters.sort = "distance-asc";
        }
      }

      return nextFilters;
    });
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
        <span className="stage-label">Etap 3 · restauracje w pobliżu</span>
      </header>

      <main>
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">Portal z ocenami restauracji</p>
          <h1 id="page-title">Znajdź miejsce na dobry posiłek</h1>
          <p>
            Wybierz symulowaną lokalizację użytkownika, ustaw promień i zobacz lokale
            znajdujące się w pobliżu.
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

              <div className="location-filter">
                <p>Symulowana lokalizacja użytkownika</p>
                <label>
                  Pozycja
                  <select name="locationId" value={filters.locationId} onChange={updateFilter}>
                    {SIMULATED_LOCATIONS.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.label}
                      </option>
                    ))}
                  </select>
                </label>

                {isNearbySearch && (
                  <label>
                    Promień wyszukiwania
                    <select name="radiusKm" value={filters.radiusKm} onChange={updateFilter}>
                      <option value="0.5">500 m</option>
                      <option value="1">1 km</option>
                      <option value="2">2 km</option>
                      <option value="3">3 km</option>
                      <option value="5">5 km</option>
                    </select>
                  </label>
                )}
              </div>

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
                  <option value="distance-asc" disabled={!isNearbySearch}>
                    Najbliżej
                  </option>
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
              <p>
                {isNearbySearch
                  ? `Pozycja symulowana: ${selectedLocation.label}. Promień: ${filters.radiusKm} km.`
                  : "Filtry są wykonywane w bazie danych przez Django ORM."}
              </p>
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
                      {restaurant.distance_km !== null ? (
                        <span className="distance-label">{formatDistance(restaurant.distance_km)}</span>
                      ) : (
                        <span className="price-level">Dane z MySQL</span>
                      )}
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
        Projekt zaliczeniowy · Aplikacje internetowe · Etap 3
      </footer>
    </div>
  );
}
