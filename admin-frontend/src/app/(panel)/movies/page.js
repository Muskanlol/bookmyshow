"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { Alert, Badge, PageHeader, Pager, Table, buttonClass, inputClass, quietButton, statusTone } from "@/components/ui";

export default function MoviesPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/admin/movies/", {
      query: { page, page_size: 20, search: query, status },
    })
      .then((data) => {
        setRows(data.results);
        setCount(data.count);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [page, query, status]);

  async function archive(movie) {
    if (!confirm(`Mark ${movie.title} as ended?`)) return;
    try {
      await api(`/api/v1/admin/movies/${movie.id}/`, { method: "PATCH", body: { status: "ended" } });
      setRows((current) => current.map((item) => (item.id === movie.id ? { ...item, status: "ended" } : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Movies"
        subtitle="Now showing, coming soon, and archived titles."
        action={
          <Link href="/movies/new" className={buttonClass}>
            New movie
          </Link>
        }
      />
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Search title"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={`${inputClass} max-w-[180px]`}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="now_showing">Now Showing</option>
          <option value="coming_soon">Coming Soon</option>
          <option value="ended">Ended</option>
        </select>
        <button className={quietButton} type="submit">
          Search
        </button>
      </form>
      <Alert>{error}</Alert>
      <Table
        rows={rows}
        empty="No movies match."
        columns={[
          {
            key: "title",
            label: "Title",
            render: (movie) => (
              <Link href={`/movies/${movie.id}`} className="font-medium text-ink hover:text-brand">
                {movie.title}
              </Link>
            ),
          },
          { key: "language", label: "Language" },
          { key: "genre", label: "Genre" },
          {
            key: "status",
            label: "Status",
            render: (movie) => <Badge tone={statusTone(movie.status)}>{titleCase(movie.status)}</Badge>,
          },
          {
            key: "actions",
            label: "",
            render: (movie) =>
              movie.status === "ended" ? null : (
                <button type="button" className={quietButton} onClick={() => archive(movie)}>
                  Archive
                </button>
              ),
          },
        ]}
      />
      <Pager page={page} total={count} onPage={setPage} />
    </div>
  );
}
