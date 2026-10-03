"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Alert, Badge, Field, PageHeader, buttonClass, inputClass, quietButton } from "@/components/ui";

export default function TheatreDetailPage({ params }) {
  const { id } = use(params);
  const [theatre, setTheatre] = useState(null);
  const [screens, setScreens] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      const [theatreData, screenData] = await Promise.all([
        api(`/api/v1/admin/theatres/${id}/`),
        api("/api/v1/admin/screens/", { query: { theatre: id, page_size: 100 } }),
      ]);
      setTheatre(theatreData);
      setScreens(screenData.results);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function addScreen(event) {
    event.preventDefault();
    try {
      await api("/api/v1/admin/screens/", { method: "POST", body: { theatre: Number(id), name } });
      setName("");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleActive() {
    try {
      await api(`/api/v1/admin/theatres/${id}/`, {
        method: "PATCH",
        body: { is_active: !theatre.is_active },
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!theatre) {
    return <Alert>{error || "Loading…"}</Alert>;
  }

  return (
    <div>
      <PageHeader
        title={theatre.name}
        subtitle={`${theatre.city_name} · ${theatre.address}`}
        action={
          <button type="button" className={quietButton} onClick={toggleActive}>
            {theatre.is_active ? "Mark inactive" : "Mark active"}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={theatre.is_active ? "green" : "red"}>{theatre.is_active ? "Active" : "Inactive"}</Badge>
        {(theatre.amenities || []).map((item) => (
          <Badge key={item}>{item}</Badge>
        ))}
      </div>
      <Alert>{error}</Alert>
      <form onSubmit={addScreen} className="mb-5 flex flex-wrap items-end gap-2">
        <Field label="New screen">
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Screen 1" required />
        </Field>
        <button className={buttonClass} type="submit">
          Add screen
        </button>
      </form>
      <div className="grid gap-3">
        {screens.length === 0 ? <p className="text-sm text-zinc-500">No screens yet.</p> : null}
        {screens.map((screen) => (
          <div key={screen.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
            <div>
              <p className="font-medium">{screen.name}</p>
              <p className="text-sm text-zinc-500">
                {screen.total_rows} rows × {screen.total_cols} columns · {screen.seat_count} cells
              </p>
            </div>
            <Link href={`/screens/${screen.id}/layout`} className={quietButton}>
              Seat layout
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
