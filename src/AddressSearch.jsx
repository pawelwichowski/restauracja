import { useState } from "react";

export default function AddressSearch({
  label,
  query,
  onQueryChange,
  selectedLocation,
  onSelectLocation,
  onSelectionCleared,
  placeholder,
  inputName,
  required = false,
  showClear = false,
  className = "",
}) {
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (event) => {
    onQueryChange(event.target.value);
    if (selectedLocation) onSelectionCleared?.();
    setResults([]);
    setError("");
  };

  const searchAddress = async () => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 3) {
      setError("Wpisz adres zawierający co najmniej 3 znaki.");
      return;
    }

    setBusy(true);
    setError("");
    setResults([]);

    try {
      const response = await fetch(`/api/geocode/address?q=${encodeURIComponent(normalizedQuery)}`, {
        credentials: "same-origin",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.detail || "Nie udało się wyszukać adresu.");
      }

      setResults(payload.results);
      if (!payload.results.length) {
        setError("Nie znaleziono pasującego adresu. Doprecyzuj ulicę lub miasto.");
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const chooseLocation = (location) => {
    onQueryChange(location.display_name);
    onSelectLocation(location);
    setResults([]);
    setError("");
  };

  const clearLocation = () => {
    onQueryChange("");
    onSelectionCleared?.();
    setResults([]);
    setError("");
  };

  return (
    <div className={`address-search ${className}`.trim()}>
      <div className="address-search-field">
        <label>
          {label}{required ? " *" : ""}
          <input
            name={inputName}
            type="search"
            value={query}
            onChange={handleInputChange}
            placeholder={placeholder}
            required={required}
          />
        </label>
        <button className="secondary-button" type="button" onClick={searchAddress} disabled={busy}>
          {busy ? "Wyszukiwanie…" : "Znajdź adres"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="address-results" role="listbox" aria-label="Wyniki wyszukiwania adresu">
          {results.map((location) => (
            <button
              className="address-result"
              type="button"
              key={`${location.osm_type || "place"}-${location.osm_id || `${location.latitude}-${location.longitude}`}`}
              onClick={() => chooseLocation(location)}
            >
              {location.display_name}
            </button>
          ))}
        </div>
      )}

      {selectedLocation && (
        <div className="selected-location" role="status">
          <span>Lokalizacja wybrana: {selectedLocation.display_name}</span>
          {showClear && (
            <button className="address-clear-button" type="button" onClick={clearLocation}>
              Wyczyść
            </button>
          )}
        </div>
      )}

      {error && <p className="form-message form-error">{error}</p>}
      <p className="geocoding-attribution">
        Wyszukiwanie adresów: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
      </p>
    </div>
  );
}
