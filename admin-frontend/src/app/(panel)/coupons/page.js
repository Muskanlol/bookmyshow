"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { titleCase, when } from "@/lib/format";
import { Alert, Badge, Field, Modal, PageHeader, Table, buttonClass, inputClass, quietButton } from "@/components/ui";

const empty = {
  code: "",
  type: "flat",
  value: "50",
  valid_from: "",
  valid_to: "",
  max_uses: 100,
};

function toInput(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function CouponsPage() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  async function load() {
    try {
      const data = await api("/api/v1/admin/coupons/", { query: { page_size: 100 } });
      setRows(data.results);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(empty);
    setEditing("new");
  }

  function openEdit(coupon) {
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      valid_from: toInput(coupon.valid_from),
      valid_to: toInput(coupon.valid_to),
      max_uses: coupon.max_uses,
    });
    setEditing(coupon);
  }

  async function save(event) {
    event.preventDefault();
    const body = { ...form, value: form.value, max_uses: Number(form.max_uses) };
    try {
      if (editing === "new") await api("/api/v1/admin/coupons/", { method: "POST", body });
      else await api(`/api/v1/admin/coupons/${editing.id}/`, { method: "PATCH", body });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(coupon) {
    if (!confirm(`Delete ${coupon.code}?`)) return;
    try {
      await api(`/api/v1/admin/coupons/${coupon.id}/`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Customers will apply these later. Codes are stored in uppercase."
        action={<button type="button" className={buttonClass} onClick={openCreate}>New coupon</button>}
      />
      <Alert>{error}</Alert>
      <Table
        rows={rows}
        empty="No coupons yet."
        columns={[
          { key: "code", label: "Code" },
          { key: "type", label: "Type", render: (coupon) => <Badge>{titleCase(coupon.type)}</Badge> },
          { key: "value", label: "Value", render: (coupon) => (coupon.type === "percent" ? `${coupon.value}%` : `₹${coupon.value}`) },
          { key: "uses", label: "Uses", render: (coupon) => `${coupon.used_count} / ${coupon.max_uses}` },
          { key: "valid_to", label: "Valid until", render: (coupon) => when(coupon.valid_to) },
          {
            key: "actions",
            label: "",
            render: (coupon) => (
              <div className="flex justify-end gap-2">
                <button type="button" className={quietButton} onClick={() => openEdit(coupon)}>Edit</button>
                <button type="button" className={quietButton} onClick={() => remove(coupon)}>Delete</button>
              </div>
            ),
          },
        ]}
      />
      {editing ? (
        <Modal title={editing === "new" ? "New coupon" : "Edit coupon"} onClose={() => setEditing(null)}>
          <form onSubmit={save} className="space-y-3">
            <Field label="Code">
              <input className={inputClass} value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} required />
            </Field>
            <Field label="Type">
              <select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                <option value="flat">Flat amount</option>
                <option value="percent">Percent</option>
              </select>
            </Field>
            <Field label="Value">
              <input className={inputClass} type="number" min="1" step="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
            </Field>
            <Field label="Valid from">
              <input className={inputClass} type="datetime-local" value={form.valid_from} onChange={(event) => setForm({ ...form, valid_from: event.target.value })} required />
            </Field>
            <Field label="Valid to">
              <input className={inputClass} type="datetime-local" value={form.valid_to} onChange={(event) => setForm({ ...form, valid_to: event.target.value })} required />
            </Field>
            <Field label="Max uses">
              <input className={inputClass} type="number" min="1" value={form.max_uses} onChange={(event) => setForm({ ...form, max_uses: event.target.value })} required />
            </Field>
            <button className={buttonClass} type="submit">Save</button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
