"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Alert, Badge, Field, Modal, PageHeader, Table, buttonClass, inputClass, quietButton } from "@/components/ui";

const empty = { city: "", name: "", address: "", amenities: "", is_active: true };

export default function TheatresPage() {
  const [rows, setRows] = useState([]);
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  async function load() {
    try {
      const [theatreData, cityData] = await Promise.all([
        api("/api/v1/admin/theatres/", { query: { page_size: 100, city } }),
        api("/api/v1/admin/cities/", { query: { page_size: 100 } }),
      ]);
      setRows(theatreData.results);
      setCities(cityData.results);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [city]);

  async function save(event) {
    event.preventDefault();
    try {
      await api("/api/v1/admin/theatres/", {
        method: "POST",
        body: {
          city: Number(form.city),
          name: form.name,
          address: form.address,
          is_active: form.is_active,
          amenities: form.amenities.split(",").map((item) => item.trim()).filter(Boolean),
        },
      });
      setOpen(false);
      setForm(empty);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Theatres"
        subtitle="Screens and seat layouts sit under each theatre."
        action={
          <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
            Add theatre
          </button>
        }
      />
      <div className="mb-4 max-w-xs">
        <select className={inputClass} value={city} onChange={(event) => setCity(event.target.value)}>
          <option value="">All cities</option>
          {cities.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <Alert>{error}</Alert>
      <Table
        rows={rows}
        empty="No theatres yet."
        columns={[
          {
            key: "name",
            label: "Theatre",
            render: (theatre) => (
              <Link href={`/theatres/${theatre.id}`} className="font-medium hover:text-brand">
                {theatre.name}
              </Link>
            ),
          },
          { key: "city_name", label: "City" },
          {
            key: "screens",
            label: "Screens",
            render: (theatre) => theatre.screens.length,
          },
          {
            key: "is_active",
            label: "Status",
            render: (theatre) => (
              <Badge tone={theatre.is_active ? "green" : "red"}>{theatre.is_active ? "Active" : "Inactive"}</Badge>
            ),
          },
        ]}
      />
      {open ? (
        <Modal title="New theatre" onClose={() => setOpen(false)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="City">
              <select className={inputClass} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} required>
                <option value="">Choose a city</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field label="Address">
              <textarea className={inputClass} rows={2} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} required />
            </Field>
            <Field label="Amenities">
              <input
                className={inputClass}
                placeholder="Parking, Food court"
                value={form.amenities}
                onChange={(event) => setForm({ ...form, amenities: event.target.value })}
              />
            </Field>
            <button className={buttonClass} type="submit">
              Save
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
