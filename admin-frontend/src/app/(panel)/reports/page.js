"use client";

import { useEffect, useState } from "react";
import { api, downloadCsv } from "@/lib/api";
import { dayLabel, inr, when } from "@/lib/format";
import { Alert, PageHeader, buttonClass, inputClass, quietButton } from "@/components/ui";

export default function ReportsPage() {
  const [groupBy, setGroupBy] = useState("movie");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDate, setShowDate] = useState("");
  const [revenue, setRevenue] = useState([]);
  const [occupancy, setOccupancy] = useState(null);
  const [error, setError] = useState("");

  function loadRevenue(nextGroup = groupBy) {
    api("/api/v1/admin/reports/revenue/", {
      query: { group_by: nextGroup, date_from: dateFrom, date_to: dateTo },
    })
      .then((data) => {
        setRevenue(data.results);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  function loadOccupancy(date = showDate) {
    api("/api/v1/admin/reports/occupancy/", { query: { date } })
      .then(setOccupancy)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadRevenue("movie");
    loadOccupancy("");
  }, []);

  async function exportCsv() {
    try {
      await downloadCsv("/api/v1/admin/reports/export.csv", { date_from: dateFrom, date_to: dateTo });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Revenue uses successful payments. Occupancy is for shows on the chosen date." />
      <Alert>{error}</Alert>

      <section>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <select
            className={`${inputClass} max-w-[160px]`}
            value={groupBy}
            onChange={(event) => {
              setGroupBy(event.target.value);
              loadRevenue(event.target.value);
            }}
          >
            <option value="movie">By movie</option>
            <option value="theatre">By theatre</option>
            <option value="date">By date</option>
          </select>
          <input className={`${inputClass} max-w-[160px]`} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          <input className={`${inputClass} max-w-[160px]`} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          <button type="button" className={quietButton} onClick={() => loadRevenue()}>Apply</button>
          <button type="button" className={buttonClass} onClick={exportCsv}>Download CSV</button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">{groupBy === "date" ? "Date" : "Name"}</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {revenue.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-zinc-500">No payments in this range.</td></tr>
              ) : revenue.map((row) => (
                <tr key={row.movie_id || row.theatre_id || row.date} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    {groupBy === "date" ? dayLabel(row.date) : row.name}
                    {row.city ? <span className="text-zinc-500"> · {row.city}</span> : null}
                  </td>
                  <td className="px-4 py-3">{row.bookings}</td>
                  <td className="px-4 py-3">{inr(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <h2 className="mr-auto text-lg font-semibold">Occupancy</h2>
          <input className={`${inputClass} max-w-[180px]`} type="date" value={showDate} onChange={(event) => setShowDate(event.target.value)} />
          <button type="button" className={quietButton} onClick={() => loadOccupancy()}>Show date</button>
        </div>
        {occupancy ? (
          <p className="mb-2 text-sm text-zinc-500">
            {occupancy.date}: {occupancy.booked} of {occupancy.bookable} seats ({occupancy.occupancy_percent}%)
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Show</th>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Booked</th>
                <th className="px-4 py-3 font-medium">Occupancy</th>
              </tr>
            </thead>
            <tbody>
              {(occupancy?.results || []).map((row) => (
                <tr key={row.show_id} className="border-t border-zinc-100">
                  <td className="px-4 py-3">
                    {row.movie}
                    <span className="block text-xs text-zinc-500">{row.theatre} · {row.screen}</span>
                  </td>
                  <td className="px-4 py-3">{when(row.start_time)}</td>
                  <td className="px-4 py-3">{row.booked} / {row.bookable}</td>
                  <td className="px-4 py-3">{row.occupancy_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
