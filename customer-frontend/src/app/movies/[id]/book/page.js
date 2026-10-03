"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api, savedCity } from "@/lib/api";
import { dateChip, inr, showTime } from "@/lib/format";

export default function BookShowPage({ params }) {
  const { id } = use(params);
  const [city, setCity] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const sync = () => setCity(savedCity());
    sync();
    window.addEventListener("bms-city", sync);
    return () => window.removeEventListener("bms-city", sync);
  }, []);

  useEffect(() => {
    if (!city) return undefined;
    setError("");
    api(`/api/v1/movies/${id}/shows/`, { query: { city: city.id, date } })
      .then((payload) => {
        setData(payload);
        if (!date && payload.date) setDate(String(payload.date).slice(0, 10));
        document.title = `${payload.movie.title} showtimes | BookMyShow`;
      })
      .catch((err) => setError(err.message));
    return undefined;
  }, [id, city, date]);

  const movie = data?.movie;

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <Link href={`/movies/${id}`} className="text-sm text-zinc-500">Back to movie</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{movie?.title || "Showtimes"}</h1>
          <p className="text-sm text-zinc-500">
            {movie ? `${movie.certificate} · ${movie.language} · ${movie.genre}` : ""}
            {city ? ` · ${city.name}` : ""}
          </p>
        </div>
      </div>

      <div className="scroller mt-4 flex gap-2 overflow-x-auto">
        {(data?.dates || []).map((item) => {
          const value = String(item).slice(0, 10);
          const selected = value === String(data?.date || date).slice(0, 10);
          return (
            <button
              key={value}
              type="button"
              onClick={() => setDate(value)}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold ${
                selected ? "bg-brand text-white" : "bg-white text-ink shadow-sm"
              }`}
            >
              {dateChip(value)}
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      {!city ? <p className="mt-6 text-sm text-zinc-500">Choose a city from the header.</p> : null}

      <div className="mt-5 space-y-3">
        {(data?.theatres || []).map((theatre) => (
          <article key={theatre.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{theatre.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">{theatre.address}</p>
                {theatre.amenities?.length ? (
                  <p className="mt-1 text-xs text-zinc-400">{theatre.amenities.join(" · ")}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {theatre.shows.map((show) => (
                <Link
                  key={show.id}
                  href={`/shows/${show.id}`}
                  className="rounded-md border border-[#2fa84f] px-3 py-1.5 text-sm font-medium text-[#1f8a3b] hover:bg-[#2fa84f] hover:text-white"
                  title={show.min_price ? `From ${inr(show.min_price)}` : show.screen}
                >
                  {showTime(show.start_time)}
                </Link>
              ))}
            </div>
          </article>
        ))}
        {data && data.theatres.length === 0 ? (
          <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-zinc-500">
            No shows in {city?.name || "this city"} on this date.
          </p>
        ) : null}
      </div>
    </div>
  );
}
