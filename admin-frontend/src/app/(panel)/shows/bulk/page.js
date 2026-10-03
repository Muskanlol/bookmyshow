"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PriceFields, tierPayload, useCatalog } from "@/components/ShowFields";
import { api } from "@/lib/api";
import { Alert, Field, PageHeader, buttonClass, inputClass, quietButton } from "@/components/ui";

export default function BulkShowsPage() {
  const router = useRouter();
  const { movies, theatres, error: catalogError } = useCatalog();
  const [movie, setMovie] = useState("");
  const [screens, setScreens] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [slots, setSlots] = useState(["10:00", "14:00", "18:30"]);
  const [prices, setPrices] = useState({ premier: "400", gold: "250", silver: "150" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleScreen(id) {
    setScreens((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await api("/api/v1/admin/shows/bulk-create/", {
        method: "POST",
        body: {
          movie: Number(movie),
          screen_ids: screens,
          date_from: dateFrom,
          date_to: dateTo,
          time_slots: slots.filter(Boolean),
          tier_prices: tierPayload(prices),
        },
      });
      router.push("/shows");
      return data;
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bulk create shows"
        subtitle="One movie, several screens, a date range, and time slots. The whole batch is rejected if any slot overlaps."
      />
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
        <div>
          <p className="mb-2 text-sm font-medium text-zinc-700">Screens</p>
          <div className="grid gap-2 md:grid-cols-2">
            {theatres.flatMap((theatre) =>
              theatre.screens.map((screen) => (
                <label key={screen.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={!screen.total_rows}
                    checked={screens.includes(screen.id)}
                    onChange={() => toggleScreen(screen.id)}
                  />
                  {theatre.name} · {screen.name}
                  {screen.total_rows ? "" : " (no seats)"}
                </label>
              )),
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="From">
            <input className={inputClass} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} required />
          </Field>
          <Field label="To">
            <input className={inputClass} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} required />
          </Field>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700">Time slots</p>
            <button type="button" className={quietButton} onClick={() => setSlots([...slots, "21:00"])}>
              Add slot
            </button>
          </div>
          {slots.map((slot, index) => (
            <input
              key={index}
              className={inputClass}
              type="time"
              value={slot}
              onChange={(event) => setSlots(slots.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
              required
            />
          ))}
        </div>
        <PriceFields prices={prices} setPrices={setPrices} />
        <button className={buttonClass} disabled={saving || screens.length === 0} type="submit">
          {saving ? "Creating…" : "Create shows"}
        </button>
      </form>
    </div>
  );
}
