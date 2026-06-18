import { useEffect, useState } from "react";

function getCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

export default function AddRestaurantModal({ cuisines, onClose, onCreated }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedCuisines = formData.getAll("cuisine");

    if (!selectedCuisines.length) {
      setError("Wybierz co najmniej jeden rodzaj kuchni.");
      return;
    }

    formData.delete("cuisine");
    formData.set("cuisine_names", JSON.stringify(selectedCuisines));
    setBusy(true);
    setError("");

    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch("/api/restaurants", {
        method: "POST",
        credentials: "same-origin",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.detail || "Nie udało się dodać restauracji.");
      }

      onCreated(payload.restaurant);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="restaurant-modal" role="dialog" aria-modal="true" aria-labelledby="restaurant-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Zamknij formularz">
          ×
        </button>
        <p className="eyebrow">Nowa restauracja</p>
        <h2 id="restaurant-title">Dodaj restaurację</h2>
        <p className="form-hint">Pola oznaczone gwiazdką są wymagane.</p>

        <form className="restaurant-form" onSubmit={handleSubmit}>
          <label>
            Nazwa restauracji *
            <input name="name" minLength="2" maxLength="150" required placeholder="np. Bistro Zielony Talerz" />
          </label>

          <label>
            Adres *
            <input name="address" maxLength="255" required placeholder="ul. Przykładowa 12, Poznań" />
          </label>

          <div className="coordinates-row">
            <label>
              Szerokość geograficzna *
              <input name="latitude" type="number" step="0.000001" min="-90" max="90" required placeholder="52.406374" />
            </label>
            <label>
              Długość geograficzna *
              <input name="longitude" type="number" step="0.000001" min="-180" max="180" required placeholder="16.925168" />
            </label>
          </div>

          <label>
            Krótki opis
            <textarea name="description" maxLength="1000" rows="3" placeholder="Co wyróżnia to miejsce?" />
          </label>

          <fieldset className="cuisine-selection">
            <legend>Rodzaje kuchni *</legend>
            <div className="cuisine-options">
              {cuisines.map((cuisine) => (
                <label className="cuisine-option" key={cuisine}>
                  <input name="cuisine" type="checkbox" value={cuisine} />
                  <span>{cuisine}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            Zdjęcie restauracji *
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required onChange={handlePhotoChange} />
          </label>
          <p className="form-hint">Akceptowane formaty: JPG, PNG, WebP. Maksymalny rozmiar: 5 MB.</p>

          {previewUrl && <img className="photo-preview" src={previewUrl} alt="Podgląd wybranego zdjęcia" />}

          {error && <p className="form-message form-error">{error}</p>}

          <div className="restaurant-form-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
              Anuluj
            </button>
            <button className="primary-button" type="submit" disabled={busy || cuisines.length === 0}>
              {busy ? "Dodawanie…" : "Dodaj restaurację"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
