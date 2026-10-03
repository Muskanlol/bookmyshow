"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PriceFields, ScreenSelect, tierPayload, useCatalog } from "@/components/ShowFields";
import { api } from "@/lib/api";
import { Alert, Field, PageHeader, buttonClass, inputClass } from "@/components/ui";

const DEFAULT_PRICES = { premier: "400", gold: "250", silver: "150" };

export default function NewShowPage() {
  const router = useRouter();
  const { movies, theatres, error: catalogError } = useCatalog();
  const [movie, setMovie] = useState("");
  const [screen, setScreen] = useState("");
  const [start, setStart] = useState("");
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/api/v1/admin/shows/", {
        method: "POST",
        body: {
          movie: Number(movie),
          screen: Number(screen),
          start_time: start,
          tier_prices: tierPayload(prices),
        },
      });
      router.push("/shows");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="Schedule a show" subtitle="Times are India time. The server sets the end time." />
      <Alert>{catalogError || error}</Alert>
      <form onSubmit={save} className="mt-3 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
        <Field label="Movie">
          <select className={inputClass} value={movie} onChange={(event) => setMovie(event.target.value)} required>
            <option value="">Choose a movie</option>
            {movies.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </Field>
        <Field label="Screen">
          <ScreenSelect theatres={theatres} value={screen} onChange={setScreen} />
        </Field>
        <Field label="Start">
          <input className={inputClass} type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} required />
        </Field>
        <PriceFields prices={prices} setPrices={setPrices} />
        <button className={buttonClass} disabled={saving} type="submit">
          {saving ? "Saving…" : "Create show"}
        </button>
      </form>
    </div>
  );
}
