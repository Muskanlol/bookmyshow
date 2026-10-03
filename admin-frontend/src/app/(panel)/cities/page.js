"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Alert, Field, Modal, PageHeader, Pager, Table, buttonClass, inputClass, quietButton } from "@/components/ui";

const empty = { name: "", state: "" };

export default function CitiesPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  async function load() {
    try {
      const data = await api("/api/v1/admin/cities/", { query: { page, search: query, page_size: 20 } });
      setRows(data.results);
      setCount(data.count);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [page, query]);

  function openCreate() {
    setForm(empty);
    setEditing("new");
  }

  function openEdit(city) {
    setForm({ name: city.name, state: city.state });
    setEditing(city);
  }

  async function save(event) {
    event.preventDefault();
    try {
      if (editing === "new") {
        await api("/api/v1/admin/cities/", { method: "POST", body: form });
      } else {
        await api(`/api/v1/admin/cities/${editing.id}/`, { method: "PATCH", body: form });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(city) {
    if (!confirm(`Delete ${city.name}?`)) return;
    try {
      await api(`/api/v1/admin/cities/${city.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cities"
        subtitle="Where theatres live."
        action={
          <button type="button" className={buttonClass} onClick={openCreate}>
            Add city
          </button>
        }
      />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <input
          className={inputClass}
          placeholder="Search name or state"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className={quietButton} type="submit">
          Search
        </button>
      </form>
      <Alert>{error}</Alert>
      <div className="mt-3">
        <Table
          rows={rows}
          empty="No cities match."
          columns={[
            { key: "name", label: "City" },
            { key: "state", label: "State" },
            {
              key: "actions",
              label: "",
              render: (city) => (
                <div className="flex justify-end gap-2">
                  <button type="button" className={quietButton} onClick={() => openEdit(city)}>
                    Edit
                  </button>
                  <button type="button" className={quietButton} onClick={() => remove(city)}>
                    Delete
                  </button>
                </div>
              ),
            },
          ]}
        />
        <Pager page={page} total={count} onPage={setPage} />
      </div>
      {editing ? (
        <Modal title={editing === "new" ? "New city" : "Edit city"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Name">
              <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field label="State">
              <input className={inputClass} value={form.state} onChange={(event) => setForm({ ...form, state: event.target.value })} required />
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
