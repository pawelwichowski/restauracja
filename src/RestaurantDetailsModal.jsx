import { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog.jsx";

function getCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

function formatRating(rating) {
  return Number(rating).toFixed(1).replace(".", ",");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(value));
}

function ReviewEditor({ initialRating = 5, initialComment = "", submitLabel, busy, error, onSubmit, onCancel }) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);

  const submit = (event) => {
    event.preventDefault();
    onSubmit({ rating: Number(rating), comment });
  };

  return (
    <form className="review-form" onSubmit={submit}>
      <label>
        Ocena *
        <select value={rating} onChange={(event) => setRating(event.target.value)}>
          <option value="5">5 — świetnie</option>
          <option value="4">4 — bardzo dobrze</option>
          <option value="3">3 — dobrze</option>
          <option value="2">2 — słabo</option>
          <option value="1">1 — bardzo słabo</option>
        </select>
      </label>
      <label>
        Komentarz (opcjonalnie)
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows="4"
          maxLength="2000"
          placeholder="Napisz, jak oceniasz to miejsce…"
        />
      </label>
      {error && <p className="form-message form-error">{error}</p>}
      <div className="review-actions">
        {onCancel && <button className="secondary-button" type="button" onClick={onCancel} disabled={busy}>Anuluj</button>}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Zapisywanie…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function RestaurantDetailsModal({
  restaurantId,
  currentUser,
  onClose,
  onEditRestaurant,
  onRestaurantChanged,
  onRestaurantDeleted,
}) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const request = async (path, options = {}) => {
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
    const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.detail || "Operacja nie powiodła się.");
    return payload;
  };

  const loadRestaurant = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await request(`/api/restaurants/${restaurantId}`);
      setRestaurant(payload.restaurant);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurant();
  }, [restaurantId]);

  const refreshAfterChange = async () => {
    await loadRestaurant();
    onRestaurantChanged();
  };

  const submitNewReview = async (values) => {
    setReviewBusy(true);
    setReviewError("");
    try {
      await request(`/api/restaurants/${restaurantId}/reviews`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      await refreshAfterChange();
    } catch (requestError) {
      setReviewError(requestError.message);
    } finally {
      setReviewBusy(false);
    }
  };

  const submitEditedReview = async (values) => {
    setReviewBusy(true);
    setReviewError("");
    try {
      await request(`/api/reviews/${editingReview.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      setEditingReview(null);
      await refreshAfterChange();
    } catch (requestError) {
      setReviewError(requestError.message);
    } finally {
      setReviewBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!confirmTarget) return;
    setDeleteBusy(true);
    setReviewError("");
    try {
      if (confirmTarget.type === "review") {
        await request(`/api/reviews/${confirmTarget.review.id}/delete`, { method: "DELETE" });
        setConfirmTarget(null);
        await refreshAfterChange();
      } else {
        await request(`/api/restaurants/${restaurantId}/delete`, { method: "DELETE" });
        onRestaurantDeleted(restaurant.name);
      }
    } catch (requestError) {
      setReviewError(requestError.message);
      setConfirmTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-backdrop"><section className="details-modal"><p>Wczytywanie szczegółów restauracji…</p></section></div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="modal-backdrop" role="presentation">
        <section className="details-modal" role="dialog" aria-modal="true">
          <button className="modal-close" type="button" onClick={onClose} aria-label="Zamknij szczegóły">×</button>
          <h2>Nie można otworzyć szczegółów</h2>
          <p className="form-message form-error">{error || "Nie znaleziono restauracji."}</p>
        </section>
      </div>
    );
  }

  const ownReview = restaurant.reviews.find((review) => review.can_edit);

  return (
    <>
      <div className="modal-backdrop" role="presentation">
        <section className="details-modal" role="dialog" aria-modal="true" aria-labelledby="details-title">
          <button className="modal-close" type="button" onClick={onClose} aria-label="Zamknij szczegóły">×</button>
          {restaurant.photo_url ? (
            <img className="details-photo" src={restaurant.photo_url} alt={`Zdjęcie ${restaurant.name}`} />
          ) : (
            <div className="details-photo details-photo-placeholder">Brak zdjęcia</div>
          )}

          <div className="details-content">
            <div className="details-heading">
              <div>
                <p className="eyebrow">{restaurant.cuisines.join(", ")}</p>
                <h2 id="details-title">{restaurant.name}</h2>
                <p className="address">{restaurant.address}</p>
              </div>
              <div className="details-rating"><span>★</span><strong>{formatRating(restaurant.average_rating)}</strong><small>{restaurant.review_count} opinii</small></div>
            </div>

            <p className="description">{restaurant.description || "Brak opisu restauracji."}</p>
            {restaurant.owner && <p className="details-owner">Dodane przez: {restaurant.owner}</p>}

            {restaurant.can_edit && (
              <div className="owner-actions">
                <button className="secondary-button" type="button" onClick={() => onEditRestaurant(restaurant)}>
                  Edytuj restaurację
                </button>
                <button className="danger-button" type="button" onClick={() => setConfirmTarget({ type: "restaurant" })}>
                  Usuń restaurację
                </button>
              </div>
            )}

            <section className="reviews-section">
              <div className="reviews-heading"><h3>Opinie</h3><span>{restaurant.review_count}</span></div>

              {currentUser && !ownReview && (
                <div className="review-panel">
                  <h4>Dodaj swoją opinię</h4>
                  <ReviewEditor submitLabel="Opublikuj opinię" busy={reviewBusy} error={reviewError} onSubmit={submitNewReview} />
                </div>
              )}

              {!currentUser && <p className="form-hint">Zaloguj się, aby wystawić opinię.</p>}
              {ownReview && !editingReview && <p className="form-hint">Możesz mieć tylko jedną opinię dla tej restauracji. Możesz ją edytować albo usunąć.</p>}

              {restaurant.reviews.length ? (
                <div className="review-list">
                  {restaurant.reviews.map((review) => (
                    <article className="review-card" key={review.id}>
                      {editingReview?.id === review.id ? (
                        <>
                          <h4>Edytuj swoją opinię</h4>
                          <ReviewEditor
                            initialRating={review.rating}
                            initialComment={review.comment}
                            submitLabel="Zapisz opinię"
                            busy={reviewBusy}
                            error={reviewError}
                            onSubmit={submitEditedReview}
                            onCancel={() => { setEditingReview(null); setReviewError(""); }}
                          />
                        </>
                      ) : (
                        <>
                          <div className="review-card-heading">
                            <strong>{review.author}</strong>
                            <span><b>★ {review.rating}</b> · {formatDate(review.updated_at)}</span>
                          </div>
                          {review.comment ? <p>{review.comment}</p> : <p className="empty-comment">Ocena bez komentarza.</p>}
                          {review.can_edit && (
                            <div className="review-owner-actions">
                              <button type="button" onClick={() => { setEditingReview(review); setReviewError(""); }}>Edytuj opinię</button>
                              <button className="danger-text-button" type="button" onClick={() => setConfirmTarget({ type: "review", review })}>Usuń opinię</button>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="form-hint">Ta restauracja nie ma jeszcze opinii.</p>
              )}
            </section>
          </div>
        </section>
      </div>

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.type === "restaurant" ? "Usunąć restaurację?" : "Usunąć opinię?"}
          message={confirmTarget.type === "restaurant"
            ? "Ta operacja jest nieodwracalna. Restauracja oraz jej opinie zostaną trwale usunięte."
            : "Ta operacja jest nieodwracalna. Opinia zostanie trwale usunięta."}
          confirmLabel={confirmTarget.type === "restaurant" ? "Usuń restaurację" : "Usuń opinię"}
          busy={deleteBusy}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}
