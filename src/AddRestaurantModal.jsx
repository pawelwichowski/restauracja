import { useEffect, useState } from "react";

function getCookie(name) {
  const prefix = `${name}=`;
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix))
    ?.slice(prefix.length);
}

function initialLocation(restaurant) {
  if (restaurant?.latitude === null || restaurant?.latitude === undefined) return null;
  if (restaurant?.longitude === null || restaurant?.longitude === undefined) return null;

  return {
    display_name: restaurant.address,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };
}

export default function AddRestaurantModal({ cuisines, restaurant = null, onClose, onSaved }) {
  const isEditing = Boolean(restaurant);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(restaurant?.photo_url || "");
  const [address, setAddress] = useState(restaurant?.address || "");
  const [selectedLocation, setSelectedLocation] = useState(() => initialLocation(restaurant));
  const [addressResults, setAddressResults] = useState([]);
  const [addressBusy, setAddressBusy] = useState(false);
  const [photoRequired, setPhotoRequired] = useState(false);

  useEffect(() => () => {
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    fetch("/api/app-config", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((config) => setPhotoRequired(Boolean(config.restaurant_photo_required)))
      .catch(() => setPhotoRequired(false));
  }, []);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : restaurant?.photo_url || "");
  };

  const handleAddressChange = (event) => {
    setAddress(event.target.value);
    setSelectedLocation(null);
    setAddressResults([]);
  };

  const searchAddress = async () => {
    const query = address.trim();
    if (query.length < 3) {
      setError("Wpisz adres zawierający co najmniej 3 znaki.");
      return;
    }

    setAddressBusy(true);
    setError("");
    setAddressResults([]);

    try {
      const response = await fetch(`/api/geocode/address?q=${encodeURIComponent(query)}`, {
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Nie udało się wyszukać adresu.");
      }
      setAddressResults(payload.results);
      if (!payload.results.length) {
        setError("Nie znaleziono pasującego adresu. Doprecyzuj nazwę ulicy lub miasto.");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAddressBusy(false);
    }
  };

  const chooseLocation = (location) => {
    setAddress(location.display_name);
    setSelectedLocation(location);
    setAddressResults([]);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedCuisines = formData.getAll("cuisine");

    if (!selectedCuisines.length) {
      setError("Wybierz co najmniej jeden rodzaj kuchni.");
      return;
    }
    if (!selectedLocation) {
      setError("Wyszukaj adres i wybierz właściwą lokalizację z listy.");
      return;
    }

    formData.delete("cuisine");
    formData.set("cuisine_names", JSON.stringify(selectedCuisines));
    formData.set("address", address);
    formData.set("latitude", String(selectedLocation.latitude));
    formData.set("longitude", String(selectedLocation.longitude));
    setBusy(true);
    setError("");

    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(
        isEditing ? `/api/restaurants/${restaurant.id}/edit` : "/api/restaurants",
        {
          method: "POST",
          credentials: "same-origin",
          headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
          body: formData,
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.detail || (isEditing ? "Nie udało się edytować restauracji." : "Nie udało się dodać restauracji."),
        );
      }

      onSaved(payload.restaurant);
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
        <p className="eyebrow">{isEditing ? "Twoja restauracja" : "Nowa restauracja"}</p>
        <h2 id="restaurant-title">{isEditing ? "Edytuj restaurację" : "Dodaj restaurację"}</h2>
        <p className="form-hint">Pola oznaczone gwiazdką są wymagane.</p>

        <form className="restaurant-form" onSubmit={handleSubmit}>
          <label>
            Nazwa restauracji *
            <input
              name="name"
              minLength="2"
              maxLength="150"
              required
              defaultValue={restaurant?.name || ""}
              placeholder="np. Bistro Zielony Talerz"
            />
          </label>

          <div className="address-search-field">
            <label>
              Adres lokalu *
              <input
                name="address"
                maxLength="255"
                required
                value={address}
                onChange={handleAddressChange}
                placeholder="np. Stary Rynek 1, Poznań"
              />
            </label>
            <button className="secondary-button" type="button" onClick={searchAddress} disabled={addressBusy}>
              {addressBusy ? "Wyszukiwanie…" : "Znajdź adres"}
            </button>
          </div>

          {addressResults.length > 0 && (
            <div className="address-results" role="listbox" aria-label="Wyniki wyszukiwania adresu">
              {addressResults.map((location) => (
                <button
                  className="address-result"
                  type="button"
                  key={`${location.osm_type}-${location.osm_id}`}
                  onClick={() => chooseLocation(location)}
                >
                  {location.display_name}
                </button>
              ))}
            </div>
          )}

          {selectedLocation && (
            <p className="selected-location" role="status">
              Lokalizacja wybrana: {selectedLocation.display_name}
            </p>
          )}
          <p className="geocoding-attribution">
            Wyszukiwanie adresów: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
          </p>

          <label>
            Krótki opis
            <textarea
              name="description"
              maxLength="1000"
              rows="3"
              defaultValue={restaurant?.description || ""}
              placeholder="Co wyróżnia to miejsce?"
            />
          </label>

          <fieldset className="cuisine-selection">
            <legend>Rodzaje kuchni *</legend>
            <div className="cuisine-options">
              {cuisines.map((cuisine) => (
                <label className="cuisine-option" key={cuisine}>
                  <input
                    name="cuisine"
                    type="checkbox"
                    value={cuisine}
                    defaultChecked={restaurant?.cuisines?.includes(cuisine)}
                  />
                  <span>{cuisine}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            {photoRequired && !isEditing ? "Zdjęcie restauracji *" : "Zdjęcie restauracji (opcjonalnie)"}
            <input
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required={photoRequired && !isEditing}
              onChange={handlePhotoChange}
            />
          </label>
          <p className="form-hint">
            {photoRequired && !isEditing
              ? "Dodaj zdjęcie JPG, PNG albo WebP o maksymalnym rozmiarze 5 MB."
              : "Możesz dodać zdjęcie JPG, PNG albo WebP o maksymalnym rozmiarze 5 MB."}
          </p>

          {previewUrl && <img className="photo-preview" src={previewUrl} alt="Podgląd zdjęcia restauracji" />}

          {error && <p className="form-message form-error">{error}</p>}

          <div className="restaurant-form-actions">
            <button className="secondary-button" type="button" onClick={onClose} disabled={busy}>
              Anuluj
            </button>
            <button className="primary-button" type="submit" disabled={busy || cuisines.length === 0}>
              {busy ? "Zapisywanie…" : isEditing ? "Zapisz zmiany" : "Dodaj restaurację"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
