"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Field, inputClass } from "@/components/ui";

export function useCatalog() {
  const [movies, setMovies] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api("/api/v1/admin/movies/", { query: { page_size: 100 } }),
      api("/api/v1/admin/theatres/", { query: { page_size: 100 } }),
    ])
      .then(([movieData, theatreData]) => {
        setMovies(movieData.results.filter((movie) => movie.status !== "ended"));
        setTheatres(theatreData.results.filter((theatre) => theatre.is_active));
      })
      .catch((err) => setError(err.message));
  }, []);

  return { movies, theatres, error };
}

export function PriceFields({ prices, setPrices }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {["premier", "gold", "silver"].map((tier) => (
        <Field key={tier} label={`${tier[0].toUpperCase()}${tier.slice(1)} price`}>
          <input
            className={inputClass}
            type="number"
            min="1"
            step="0.01"
            value={prices[tier]}
            onChange={(event) => setPrices({ ...prices, [tier]: event.target.value })}
            required
          />
        </Field>
      ))}
    </div>
  );
}

export function tierPayload(prices) {
  return ["premier", "gold", "silver"].map((tier) => ({ tier, price: prices[tier] }));
}

export function ScreenSelect({ theatres, value, onChange }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} required>
      <option value="">Choose a screen</option>
      {theatres.map((theatre) => (
        <optgroup key={theatre.id} label={`${theatre.name}, ${theatre.city_name}`}>
          {theatre.screens.map((screen) => (
            <option key={screen.id} value={screen.id} disabled={!screen.total_rows}>
              {screen.name}
              {screen.total_rows ? "" : " (no seats yet)"}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
