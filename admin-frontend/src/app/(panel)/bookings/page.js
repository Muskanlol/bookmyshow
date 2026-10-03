"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { inr, titleCase, when } from "@/lib/format";
import { Alert, Badge, PageHeader, Pager, Table, inputClass, quietButton, statusTone } from "@/components/ui";

export default function BookingsPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/admin/bookings/", {
      query: { page, page_size: 20, search: query, status, date },
    })
      .then((data) => {
        setRows(data.results);
        setCount(data.count);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [page, query, status, date]);

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Search by booking id, name, or phone. Date is the show date." />
      <form
        className="mb-4 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <input
          className={`${inputClass} max-w-xs`}
          placeholder="Name, phone, or id"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className={`${inputClass} max-w-[160px]`} value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <input className={`${inputClass} max-w-[180px]`} type="date" value={date} onChange={(event) => { setPage(1); setDate(event.target.value); }} />
        <button className={quietButton} type="submit">Search</button>
      </form>
      <Alert>{error}</Alert>
      <Table
        rows={rows}
        empty="No bookings match."
        columns={[
          {
            key: "id",
            label: "Id",
            render: (booking) => (
              <Link href={`/bookings/${booking.id}`} className="font-medium hover:text-brand">
                {booking.id}
              </Link>
            ),
          },
          { key: "user_name", label: "Customer" },
          { key: "user_phone", label: "Phone" },
          { key: "movie_title", label: "Movie" },
          { key: "start_time", label: "Show", render: (booking) => when(booking.start_time) },
          { key: "total", label: "Total", render: (booking) => inr(booking.total) },
          {
            key: "status",
            label: "Status",
            render: (booking) => <Badge tone={statusTone(booking.status)}>{titleCase(booking.status)}</Badge>,
          },
        ]}
      />
      <Pager page={page} total={count} onPage={setPage} />
    </div>
  );
}
