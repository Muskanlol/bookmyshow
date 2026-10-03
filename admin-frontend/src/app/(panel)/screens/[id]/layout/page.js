"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { rowLabel } from "@/lib/format";
import { Alert, Field, PageHeader, buttonClass, inputClass, quietButton } from "@/components/ui";

const TIER_CLASS = {
  premier: "bg-rose-200 text-rose-950",
  gold: "bg-amber-200 text-amber-950",
  silver: "bg-zinc-200 text-zinc-800",
};

function defaultBands(rows) {
  const premierEnd = Math.max(1, Math.min(rows, Math.round(rows * 0.25)));
  const goldEnd = Math.max(premierEnd, Math.min(rows, Math.round(rows * 0.62)));
  return [
    { from_row: 1, to_row: premierEnd, tier: "premier" },
    { from_row: Math.min(rows, premierEnd + 1), to_row: goldEnd, tier: "gold" },
    { from_row: Math.min(rows, goldEnd + 1), to_row: rows, tier: "silver" },
  ].filter((band) => band.from_row <= band.to_row);
}

function SeatCell({ seat, onClick }) {
  if (seat.is_aisle || seat.aisle) {
    return <div className="h-9 w-9 rounded border border-dashed border-zinc-300" title="Aisle" />;
  }
  const blocked = seat.is_blocked;
  return (
    <button
      type="button"
      onClick={onClick}
      title={blocked ? "Blocked" : seat.tier}
      className={`h-9 w-9 rounded text-[11px] font-semibold ${
        blocked ? "bg-zinc-800 text-white" : TIER_CLASS[seat.tier] || TIER_CLASS.silver
      }`}
    >
      {seat.number ?? seat.label?.replace(/^\D+/, "")}
    </button>
  );
}

export default function SeatLayoutPage({ params }) {
  const { id } = use(params);
  const [screen, setScreen] = useState(null);
  const [rows, setRows] = useState(8);
  const [cols, setCols] = useState(10);
  const [bands, setBands] = useState(defaultBands(8));
  const [aisles, setAisles] = useState(() => new Set([3, 8]));
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api(`/api/v1/admin/screens/${id}/`);
    setScreen(data);
    if (data.total_rows) setRows(data.total_rows);
    if (data.total_cols) setCols(data.total_cols);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    setBands(defaultBands(Number(rows) || 1));
  }, [rows]);

  const preview = useMemo(() => {
    const count = Number(cols) || 0;
    const rowCount = Number(rows) || 0;
    const grid = [];
    for (let row = 1; row <= rowCount; row += 1) {
      const tier = bands.find((band) => row >= Number(band.from_row) && row <= Number(band.to_row))?.tier || "silver";
      let number = 0;
      const seats = [];
      for (let col = 1; col <= count; col += 1) {
        if (aisles.has(col)) seats.push({ aisle: true, col });
        else {
          number += 1;
          seats.push({ col, number, tier, label: `${rowLabel(row)}${number}` });
        }
      }
      grid.push({ label: rowLabel(row), seats });
    }
    return grid;
  }, [rows, cols, bands, aisles]);

  const savedRows = useMemo(() => {
    if (!screen?.seats?.length) return [];
    const grouped = new Map();
    screen.seats.forEach((seat) => {
      if (!grouped.has(seat.row_index)) grouped.set(seat.row_index, []);
      grouped.get(seat.row_index).push(seat);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rowIndex, seats]) => ({
        label: seats[0]?.row_label || rowLabel(rowIndex),
        seats: seats.sort((a, b) => a.col_index - b.col_index),
      }));
  }, [screen]);

  function toggleAisle(column) {
    setAisles((current) => {
      const next = new Set(current);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  async function generate(event) {
    event.preventDefault();
    if (screen?.seats?.length && !confirm("Replace the current layout? Cancelled bookings keep their seat labels.")) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const data = await api(`/api/v1/admin/screens/${id}/generate-seats/`, {
        method: "POST",
        body: {
          rows: Number(rows),
          cols: Number(cols),
          row_tiers: bands.map((band) => ({
            from_row: Number(band.from_row),
            to_row: Number(band.to_row),
            tier: band.tier,
          })),
          aisle_columns: [...aisles].sort((a, b) => a - b),
        },
      });
      setScreen(data);
      setSelected(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function patchSeat(seat, changes) {
    setError("");
    try {
      const data = await api(`/api/v1/admin/screens/${id}/seats/`, {
        method: "PATCH",
        body: { seats: [{ id: seat.id, ...changes }] },
      });
      setScreen(data);
      const updated = data.seats.find((item) => item.id === seat.id);
      setSelected(updated || null);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!screen) return <Alert>{error || "Loading layout…"}</Alert>;

  return (
    <div>
      <PageHeader
        title={`${screen.name} layout`}
        subtitle={`${screen.theatre_name}, ${screen.city_name}`}
        action={
          <Link href={`/theatres/${screen.theatre}`} className={quietButton}>
            Back to theatre
          </Link>
        }
      />
      <Alert>{error}</Alert>
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-zinc-600">
        <span className="rounded bg-rose-200 px-2 py-1">Premier</span>
        <span className="rounded bg-amber-200 px-2 py-1">Gold</span>
        <span className="rounded bg-zinc-200 px-2 py-1">Silver</span>
        <span className="rounded bg-zinc-800 px-2 py-1 text-white">Blocked</span>
        <span className="rounded border border-dashed border-zinc-400 px-2 py-1">Aisle</span>
      </div>

      {savedRows.length ? (
        <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Current seats</h2>
          <p className="mb-3 text-sm text-zinc-500">Click a seat to block it or change its tier. Aisles stay empty.</p>
          <div className="space-y-2 overflow-x-auto">
            {savedRows.map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="w-6 text-xs font-semibold text-zinc-500">{row.label}</span>
                <div className="flex gap-1">
                  {row.seats.map((seat) => (
                    <SeatCell
                      key={seat.id}
                      seat={seat}
                      onClick={() => {
                        if (!seat.is_aisle) setSelected(seat);
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {selected && !selected.is_aisle ? (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-zinc-100 pt-4">
              <p className="text-sm font-medium">Seat {selected.label || selected.row_label}</p>
              <Field label="Tier">
                <select
                  className={inputClass}
                  value={selected.tier}
                  onChange={(event) => patchSeat(selected, { tier: event.target.value })}
                >
                  <option value="premier">Premier</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                </select>
              </Field>
              <button
                type="button"
                className={quietButton}
                onClick={() => patchSeat(selected, { is_blocked: !selected.is_blocked })}
              >
                {selected.is_blocked ? "Unblock" : "Block seat"}
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <form onSubmit={generate} className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">{savedRows.length ? "Rebuild layout" : "Build layout"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Rows">
            <input className={inputClass} type="number" min="1" max="30" value={rows} onChange={(event) => setRows(event.target.value)} />
          </Field>
          <Field label="Columns">
            <input className={inputClass} type="number" min="1" max="40" value={cols} onChange={(event) => setCols(event.target.value)} />
          </Field>
        </div>
        <div className="mt-4 space-y-2">
          {bands.map((band, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_140px] gap-2">
              <input
                className={inputClass}
                type="number"
                min="1"
                value={band.from_row}
                onChange={(event) =>
                  setBands((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, from_row: event.target.value } : item)))
                }
              />
              <input
                className={inputClass}
                type="number"
                min="1"
                value={band.to_row}
                onChange={(event) =>
                  setBands((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, to_row: event.target.value } : item)))
                }
              />
              <select
                className={inputClass}
                value={band.tier}
                onChange={(event) =>
                  setBands((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, tier: event.target.value } : item)))
                }
              >
                <option value="premier">Premier</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
              </select>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-zinc-700">Aisle columns</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: Number(cols) || 0 }, (_, index) => index + 1).map((column) => (
              <button
                key={column}
                type="button"
                onClick={() => toggleAisle(column)}
                className={`h-8 w-8 rounded text-xs font-semibold ${aisles.has(column) ? "bg-ink text-white" : "bg-zinc-100"}`}
              >
                {column}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 space-y-2 overflow-x-auto rounded-xl bg-zinc-50 p-3">
          <p className="text-center text-xs uppercase tracking-wide text-zinc-400">Screen this way</p>
          {preview.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-6 text-xs font-semibold text-zinc-500">{row.label}</span>
              <div className="flex gap-1">
                {row.seats.map((seat) => (
                  <SeatCell key={`${row.label}-${seat.col}`} seat={seat} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <button className={`${buttonClass} mt-4`} disabled={saving} type="submit">
          {saving ? "Saving…" : "Save layout"}
        </button>
      </form>
    </div>
  );
}
