import { useState } from "react";

function formatDate(value) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(value));
}

export default function CommentSearchModal({ onClose, onOpenRestaurant }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    setError("");
    setResults([]);
    setSearched(false);

    if (!normalizedQuery) {
      setError("Wpisz frazę do wyszukania.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(
        `/api/reviews/search?q=${encodeURIComponent(normalizedQuery)}`,
        { credentials: "same-origin" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Nie udało się wyszukać komentarzy.");
      }

      setResults(payload.results);
      setSearched(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const openRestaurant = (restaurantId) => {
    onClose();
    onOpenRestaurant(restaurantId);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="comment-search-modal" role="dialog" aria-modal="true" aria-labelledby="comment-search-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Zamknij wyszukiwarkę komentarzy">
          ×
        </button>
        <p className="eyebrow">Wyszukiwanie pełnotekstowe</p>
        <h2 id="comment-search-title">Szukaj w komentarzach</h2>
        <p className="form-hint">
          Wyszukiwane są tylko opublikowane komentarze. Wpisz słowo mające co najmniej 3 znaki.
        </p>

        <form className="comment-search-form" onSubmit={handleSubmit}>
          <label>
            Fraza
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="np. ramen, obsługa, pizza"
              maxLength="100"
              autoFocus
            />
          </label>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Wyszukiwanie…" : "Szukaj"}
          </button>
        </form>

        {error && <p className="form-message form-error">{error}</p>}

        {searched && (
          <section className="comment-search-results" aria-live="polite">
            <h3>{results.length ? `Znaleziono: ${results.length}` : "Brak wyników"}</h3>
            {results.length > 0 && (
              <div className="comment-result-list">
                {results.map((result) => (
                  <button
                    className="comment-result-card"
                    key={result.review_id}
                    type="button"
                    onClick={() => openRestaurant(result.restaurant_id)}
                  >
                    {result.restaurant_photo_url ? (
                      <img src={result.restaurant_photo_url} alt="" />
                    ) : (
                      <span className="comment-result-photo-placeholder" aria-hidden="true">★</span>
                    )}
                    <span className="comment-result-content">
                      <strong>{result.restaurant_name}</strong>
                      <span className="comment-result-meta">
                        {result.author} · ★ {result.rating} · {formatDate(result.updated_at)}
                      </span>
                      <span className="comment-result-text">{result.comment}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </section>
    </div>
  );
}
