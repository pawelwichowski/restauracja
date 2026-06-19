import { useEffect, useState } from "react";
import AddressSearch from "./AddressSearch.jsx";

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
  const [restaurantName, setRestaurantName] = useState(restaurant?.name || "");
  const [nameCheck, setNameCheck] = useState({
    checking: false,
    available: null,
    message: "",
  });
  const [address, setAddress] = useState(restaurant?.address || "");
  const [selectedLocation, setSelectedLocation] = useState(() => initialLocation(restaurant));
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

  useEffect(() => {
    const normalizedName = restaurantName.trim();
    if (normalizedName.length < 2) {
      setNameCheck({ checking: false, available: null, message: "" });
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setNameCheck({ checking: true, available: null, message: "" });
      try {
        const url = new URL("/api/restaurants/name-availability", window.location.origin);
        url.searchParams.set("name", normalizedName);
        if (restaurant?.id) url.searchParams.set("exclude_id", restaurant.id);

        const response = await fetch(url, {
          credentials: "same-origin",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.detail || "Nie udało się sprawdzić nazwy restauracji.");
        }
        if (!controller.signal.aborted) {
          setNameCheck({
            checking: false,
            available: payload.available,
            message: payload.detail || "",
          });
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError" && !controller.signal.aborted) {
          setNameCheck({
            checking: false,
            available: null,
            message: "Nie udało się sprawdzić nazwy. Zostanie zweryfikowana przy zapisie.",
          });
        }
      }
    }, 450);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [restaurantName, restaurant?.id]);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : restaurant?.photo_url || "");
  };

  const handleNameChange = (event) => {
    setRestaurantName(event.target.value);
    setError("");
  };

  const handleAddressChange = (value) => {
    setAddress(value);
    setSelectedLocation(null);
  };

  const chooseLocation = (location) => {
    setAddress(location.display_name);
    setSelectedLocation(location);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedCuisines = formData.getAll("cuisine");

    if (nameCheck.checking) {
      setError("Poczekaj na sprawdzenie nazwy restauracji.");
      return;
    }
    if (nameCheck.available === false) {
      setError(nameCheck.message || "Restauracja o tej nazwie już istnieje.");
      return;
    }
    if (!selectedCuisines.length) {
      setError("Wybierz co najmniej jeden rodzaj kuchni.");
      return;
    }
    if (!selectedLocation) {
      setError("Wyszukaj adres i wybierz właściwą lokalizację z listy.");
      return;
    }

    formData.delete("cuisine");
    formData.set("name", restaurantName.trim());
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
              value={restaurantName}
              onChange={handleNameChange}
              placeholder="np. Bistro Zielony Talerz"
              aria-describedby="restaurant-name-status"
            />
          </label>
          <p
            id="restaurant-name-status"
            className={`restaurant-name-status ${nameCheck.available === true ? "is-available" : ""} ${nameCheck.available === false ? "is-unavailable" : ""}`.trim()}
            aria-live="polite"
          >
            {nameCheck.checking && "Sprawdzanie nazwy…"}
            {!nameCheck.checking && nameCheck.message}
          </p>

          <AddressSearch
            label="Adres lokalu"
            inputName="address"
            query={address}
            onQueryChange={handleAddressChange}
            selectedLocation={selectedLocation}
            onSelectLocation={chooseLocation}
            onSelectionCleared={() => setSelectedLocation(null)}
            placeholder="np. Stary Rynek 1, Poznań"
            required
          />

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
            <button
              className="primary-button"
              type="submit"
              disabled={busy || cuisines.length === 0 || nameCheck.checking || nameCheck.available === false}
            >
              {busy ? "Zapisywanie…" : isEditing ? "Zapisz zmiany" : "Dodaj restaurację"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
