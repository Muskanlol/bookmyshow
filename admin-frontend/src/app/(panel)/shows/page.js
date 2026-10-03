"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { titleCase, when } from "@/lib/format";
import { Alert, Badge, PageHeader, Pager, Table, buttonClass, inputClass, quietButton, statusTone } from "@/components/ui";

export default function ShowsPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [date, setDate] = useState("");
  const [theatre, setTheatre] = useState("");
  const [movie, setMovie] = useState("");
  const [theatres, setTheatres] = useState([]);
  const [movies, setMovies] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api("/api/v1/admin/theatres/", { query: { page_size: 100 } }),
      api("/api/v1/admin/movies/", { query: { page_size: 100 } }),
    ])
      .then(([theatreData, movieData]) => {
        setTheatres(theatreData.results);
        setMovies(movieData.results);
      })
      .catch((err) => setError(err.message));
  }, []);

  function load() {
    api("/api/v1/admin/shows/", {
      query: { page, page_size: 20, date, theatre, movie },
    })
      .then((data) => {
        setRows(data.results);
        setCount(data.count);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [page, date, theatre, movie]);

  async function cancel(show) {
    if (!confirm("Cancel this show? Confirmed bookings have to be cancelled first.")) return;
    try {
      await api(`/api/v1/admin/shows/${show.id}/`, { method: "PATCH", body: { status: "cancelled" } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Shows"
        subtitle="End time includes a 20-minute gap. Overlapping shows on the same screen are rejected."
        action={
          <div className="flex gap-2">
            <Link href="/shows/bulk" className={quietButton}>
              Bulk create
            </Link>
            <Link href="/shows/new" className={buttonClass}>
              New show
            </Link>
          </div>
        }
      />
      <div className="mb-4 grid gap-2 md:grid-cols-3">
        <input className={inputClass} type="date" value={date} onChange={(event) => { setPage(1); setDate(event.target.value); }} />
        <select className={inputClass} value={theatre} onChange={(event) => { setPage(1); setTheatre(event.target.value); }}>
          <option value="">All theatres</option>
          {theatres.map((item) => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
        <select className={inputClass} value={movie} onChange={(event) => { setPage(1); setMovie(event.target.value); }}>
          <option value="">All movies</option>
          {movies.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </div>
      <Alert>{error}</Alert>
      <Table
        rows={rows}
        empty="No shows match."
        columns={[
          { key: "movie_title", label: "Movie" },
          { key: "theatre_name", label: "Theatre" },
          { key: "screen_name", label: "Screen" },
          { key: "start_time", label: "Starts", render: (show) => when(show.start_time) },
          { key: "end_time", label: "Ends", render: (show) => when(show.end_time) },
          {
            key: "status",
            label: "Status",
            render: (show) => <Badge tone={statusTone(show.status)}>{titleCase(show.status)}</Badge>,
          },
          {
            key: "actions",
            label: "",
            render: (show) =>
              show.status === "scheduled" ? (
                <button type="button" className={quietButton} onClick={() => cancel(show)}>
                  Cancel
                </button>
              ) : null,
          },
        ]}
      />
      <Pager page={page} total={count} onPage={setPage} />
    </div>
  );
}
