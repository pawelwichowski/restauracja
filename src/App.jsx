import { useEffect, useState } from "react";

const SIMULATED_LOCATIONS = [
  { id: "none", label: "Nie filtruj po lokalizacji" },
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

const getCookie = (name) => {
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
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

const resetRouteMatch = () => {
  const match = window.location.pathname.match(/^\/reset-hasla\/([^/]+)\/([^/]+)\/?$/);
  return match ? { uid: match[1], token: match[2] } : null;
};

function AuthModal({ mode, onClose, onSubmit, busy, error, notice }) {
  if (!mode) return null;

  const isReset = mode === "reset";
  const heading = {
    register: "Załóż konto",
    login: "Zaloguj się",
    forgot: "Przypomnij hasło",
    reset: "Ustaw nowe hasło",
  }[mode];

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Zamknij formularz">
          ×
        </button>
        <p className="eyebrow">Konto użytkownika</p>
        <h2 id="auth-title">{heading}</h2>

        {mode === "register" && (
          <form className="auth-form" onSubmit={(event) => onSubmit("register", event)}>
            <label>
              Nazwa użytkownika
              <input name="username" minLength="3" maxLength="150" required autoComplete="username" />
            </label>
            <label>
              E-mail
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Hasło
              <input name="password" type="password" required autoComplete="new-password" />
            </label>
            <label>
              Powtórz hasło
              <input name="passwordConfirmation" type="password" required autoComplete="new-password" />
            </label>
            <p className="form-hint">Hasło musi mieć co najmniej 8 znaków i nie może być zbyt proste.</p>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Tworzenie konta…" : "Utwórz konto"}
            </button>
          </form>
        )}

        {mode === "login" && (
          <form className="auth-form" onSubmit={(event) => onSubmit("login", event)}>
            <label>
              Nazwa użytkownika lub e-mail
              <input name="identity" required autoComplete="username" />
            </label>
            <label>
              Hasło
              <input name="password" type="password" required autoComplete="current-password" />
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Logowanie…" : "Zaloguj się"}
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form className="auth-form" onSubmit={(event) => onSubmit("forgot", event)}>
            <p className="form-hint">
              W lokalnej wersji projektu wiadomość nie zostanie wysłana. Jej treść i jednorazowy
              link pojawią się w terminalu, w którym działa `python manage.py runserver`.
            </p>
            <label>
              E-mail konta
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Przygotowywanie…" : "Pokaż instrukcję w terminalu"}
            </button>
          </form>
        )}

        {isReset && (
          <form className="auth-form" onSubmit={(event) => onSubmit("reset", event)}>
            <p className="form-hint">Ustaw nowe hasło dla swojego konta.</p>
            <label>
              Nowe hasło
              <input name="password" type="password" required autoComplete="new-password" />
            </label>
            <label>
              Powtórz nowe hasło
              <input name="passwordConfirmation" type="password" required autoComplete="new-password" />
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              {busy ? "Zapisywanie…" : "Zmień hasło"}
            </button>
          </form>
        )}

        {error && <p className="form-message form-error">{error}</p>}
        {notice && <p className="form-message form-success">{notice}</p>}

        {!isReset && (
          <div className="auth-links">
            {mode !== "login" && (
              <button type="button" onClick={() => onSubmit("show-login")}>
                Mam już konto
              </button>
            )}
            {mode !== "register" && (
              <button type="button" onClick={() => onSubmit("show-register")}>
                Załóż konto
              </button>
            )}
            {mode !== "forgot" && (
              <button type="button" onClick={() => onSubmit("show-forgot")}>
                Nie pamiętam hasła
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  const resetRoute = resetRouteMatch();
  const [filters, setFilters] = useState(initialFilters);
  const [restaurants, setRestaurants] = useState([]);
  const [cuisines, setCuisines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authMode, setAuthMode] = useState(resetRoute ? "reset" : null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const selectedLocation = SIMULATED_LOCATIONS.find(
    (location) => location.id === filters.locationId,
  );
  const isNearbySearch = selectedLocation?.latitude !== undefined;

  const apiRequest = async (path, options = {}) => {
    const method = options.method || "GET";
    const headers = { ...(options.headers || {}) };

    if (method !== "GET") {
      headers["Content-Type"] = "application/json";
      const csrfToken = getCookie("csrftoken");
      if (csrfToken) headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(path, {
      credentials: "same-origin",
      ...options,
      method,
      headers,
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.detail || "Wystąpił nieoczekiwany błąd.");
    }

    return payload;
  };

  useEffect(() => {
    fetch("/api/auth/csrf", { credentials: "same-origin" });
    apiRequest("/api/auth/me")
      .then((payload) => setCurrentUser(payload.authenticated ? payload.user : null))
      .catch(() => setCurrentUser(null));
  }, []);

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

    fetch(url, { signal: controller.signal, credentials: "same-origin" })
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

  const openAuth = (mode) => {
    setAuthError("");
    setAuthNotice("");
    setAuthMode(mode);
  };

  const closeAuth = () => {
    setAuthError("");
    setAuthNotice("");
    setAuthMode(null);
    if (resetRoute) window.history.replaceState({}, "", "/");
  };

  const submitAuth = async (action, event) => {
    if (action.startsWith("show-")) {
      openAuth(action.replace("show-", ""));
      return;
    }

    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(formData.entries());
    setAuthBusy(true);
    setAuthError("");
    setAuthNotice("");

    try {
      if (action === "register") {
        const payload = await apiRequest("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setCurrentUser(payload.user);
        setAuthNotice("Konto zostało utworzone. Jesteś już zalogowany.");
      }

      if (action === "login") {
        const payload = await apiRequest("/api/auth/login", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setCurrentUser(payload.user);
        setAuthNotice("Zalogowano pomyślnie.");
      }

      if (action === "forgot") {
        const payload = await apiRequest("/api/auth/password-reset", {
          method: "POST",
          body: JSON.stringify(values),
        });
        setAuthNotice(payload.detail);
      }

      if (action === "reset") {
        const payload = await apiRequest("/api/auth/password-reset/confirm", {
          method: "POST",
          body: JSON.stringify({ ...values, ...resetRoute }),
        });
        window.history.replaceState({}, "", "/");
        setAuthMode("login");
        setAuthNotice(payload.detail);
      }
    } catch (requestError) {
      setAuthError(requestError.message);
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
      setCurrentUser(null);
    } catch (requestError) {
      setAuthError(requestError.message);
      openAuth("login");
    }
  };

  const updateFilter = (event) => {
    const { name, value } = event.target;

    setFilters((currentFilters) => {
      const nextFilters = { ...currentFilters, [name]: value };
      if (name === "locationId") {
        if (value === "none" && currentFilters.sort === "distance-asc") {
          nextFilters.sort = "rating-desc";
        }
        if (value !== "none") nextFilters.sort = "distance-asc";
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
        <div className="topbar-right">
          <span className="stage-label">Etap 6 · konta użytkowników</span>
          {currentUser ? (
            <div className="user-controls">
              <span className="user-greeting">Cześć, {currentUser.username}</span>
              <button className="header-button" type="button" onClick={handleLogout}>
                Wyloguj
              </button>
            </div>
          ) : (
            <div className="user-controls">
              <button className="header-button" type="button" onClick={() => openAuth("login")}>
                Zaloguj się
              </button>
              <button className="header-button header-button-primary" type="button" onClick={() => openAuth("register")}>
                Załóż konto
              </button>
            </div>
          )}
        </div>
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
                <input name="name" type="search" value={filters.name} onChange={updateFilter} placeholder="np. ramen" />
              </label>

              <label>
                Rodzaj kuchni
                <select name="cuisine" value={filters.cuisine} onChange={updateFilter}>
                  {cuisineOptions.map((cuisine) => <option key={cuisine} value={cuisine}>{cuisine}</option>)}
                </select>
              </label>

              <div className="location-filter">
                <p>Symulowana lokalizacja użytkownika</p>
                <label>
                  Pozycja
                  <select name="locationId" value={filters.locationId} onChange={updateFilter}>
                    {SIMULATED_LOCATIONS.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
                  </select>
                </label>
                {isNearbySearch && (
                  <label>
                    Promień wyszukiwania
                    <select name="radiusKm" value={filters.radiusKm} onChange={updateFilter}>
                      <option value="0.5">500 m</option><option value="1">1 km</option><option value="2">2 km</option><option value="3">3 km</option><option value="5">5 km</option>
                    </select>
                  </label>
                )}
              </div>

              <label>
                Minimalna ocena
                <select name="minimumRating" value={filters.minimumRating} onChange={updateFilter}>
                  <option value="0">Dowolna</option><option value="4">4,0 i więcej</option><option value="4.5">4,5 i więcej</option><option value="4.7">4,7 i więcej</option>
                </select>
              </label>

              <label>
                Sortowanie
                <select name="sort" value={filters.sort} onChange={updateFilter}>
                  <option value="distance-asc" disabled={!isNearbySearch}>Najbliżej</option>
                  <option value="rating-desc">Najwyższa ocena</option><option value="rating-asc">Najniższa ocena</option><option value="name-asc">Nazwa A–Z</option>
                </select>
              </label>

              <button className="secondary-button" type="button" onClick={resetFilters}>Wyczyść filtry</button>
            </form>
          </aside>

          <section className="results-section" aria-live="polite">
            <div className="results-heading">
              <div><p className="eyebrow">Wyniki</p><h2>{resultLabel(restaurants.length)}</h2></div>
              <p>{isNearbySearch ? `Pozycja symulowana: ${selectedLocation.label}. Promień: ${filters.radiusKm} km.` : "Filtry są wykonywane w bazie danych przez Django ORM."}</p>
            </div>

            {loading ? (
              <div className="empty-state"><h3>Wczytywanie restauracji…</h3><p>Łączenie z API Django.</p></div>
            ) : error ? (
              <div className="empty-state"><h3>Nie można połączyć się z API</h3><p>{error}</p><p>Uruchom Django na porcie 8000 i sprawdź konfigurację MySQL.</p></div>
            ) : restaurants.length > 0 ? (
              <div className="restaurant-grid">
                {restaurants.map((restaurant) => (
                  <article className="restaurant-card" key={restaurant.id}>
                    <div className="card-topline">
                      <span className="cuisine-badge">{restaurant.cuisines.join(", ")}</span>
                      {restaurant.distance_km !== null ? <span className="distance-label">{formatDistance(restaurant.distance_km)}</span> : <span className="price-level">Dane z MySQL</span>}
                    </div>
                    <div className="card-content"><h3>{restaurant.name}</h3><p className="address">{restaurant.address}</p><p className="description">{restaurant.description}</p></div>
                    <footer className="rating-row"><div><span className="star" aria-hidden="true">★</span><strong>{formatRating(restaurant.average_rating)}</strong><span className="review-count">({restaurant.review_count} opinii)</span></div><button className="details-button" type="button">Szczegóły</button></footer>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state"><h3>Nie znaleziono restauracji</h3><p>Zmień kryteria wyszukiwania albo wyczyść filtry.</p><button className="primary-button" type="button" onClick={resetFilters}>Pokaż wszystkie restauracje</button></div>
            )}
          </section>
        </section>
      </main>

      <footer className="footer">Projekt zaliczeniowy · Aplikacje internetowe · Etap 6</footer>
      <AuthModal mode={authMode} onClose={closeAuth} onSubmit={submitAuth} busy={authBusy} error={authError} notice={authNotice} />
    </div>
  );
}
