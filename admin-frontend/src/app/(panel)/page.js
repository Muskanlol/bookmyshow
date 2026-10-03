"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { inr } from "@/lib/format";
import { Alert, PageHeader } from "@/components/ui";

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/admin/reports/summary/")
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={summary ? `Show date ${summary.date}` : "Bookings, revenue, and occupancy"}
        action={
          <Link href="/reports" className="text-sm font-semibold text-brand">
            Open reports
          </Link>
        }
      />
      <Alert>{error}</Alert>
      {!summary && !error ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Bookings created" value={summary.bookings_today} />
            <Stat label="Revenue" value={inr(summary.revenue_today)} />
            <Stat label="Occupancy" value={`${summary.occupancy_percent}%`} />
            <Stat label="Cancellations" value={summary.cancellations_today} />
          </div>
          <p className="mt-3 text-sm text-zinc-500">
            {summary.shows_today} shows today, {summary.tickets_today} tickets still active.
          </p>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 font-semibold">Top movies</h2>
              {summary.top_movies.length === 0 ? (
                <p className="text-sm text-zinc-500">No tickets for today’s shows yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {summary.top_movies.map((movie) => (
                    <li key={movie.movie_id} className="flex justify-between gap-3">
                      <span>{movie.title}</span>
                      <span className="text-zinc-500">
                        {movie.tickets} tickets · {inr(movie.ticket_revenue)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-4">
              <h2 className="mb-3 font-semibold">Bookings per city</h2>
              {summary.bookings_per_city.length === 0 ? (
                <p className="text-sm text-zinc-500">No confirmed bookings created today.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {summary.bookings_per_city.map((row) => (
                    <li key={row.city} className="flex justify-between">
                      <span>{row.city}</span>
                      <span className="text-zinc-500">{row.bookings}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
