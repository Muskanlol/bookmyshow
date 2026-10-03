"use client";

import { useEffect, useState } from "react";
import { api, savedUser } from "@/lib/api";
import { titleCase } from "@/lib/format";
import { Alert, Badge, PageHeader, Pager, Table, inputClass, quietButton, statusTone } from "@/components/ui";

export default function UsersPage() {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const me = savedUser();

  function load() {
    api("/api/v1/admin/users/", { query: { page, page_size: 20, search: query } })
      .then((data) => {
        setRows(data.results);
        setCount(data.count);
        setError("");
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load();
  }, [page, query]);

  async function toggle(user) {
    const next = !user.is_active;
    if (!confirm(`${next ? "Unblock" : "Block"} ${user.name}?`)) return;
    try {
      await api(`/api/v1/admin/users/${user.id}/`, { method: "PATCH", body: { is_active: next } });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Block a customer to stop them signing in later." />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setQuery(search);
        }}
      >
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Name, email, or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <button className={quietButton} type="submit">Search</button>
      </form>
      <Alert>{error}</Alert>
      <Table
        rows={rows}
        empty="No users match."
        columns={[
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone", render: (user) => user.phone || "—" },
          {
            key: "role",
            label: "Role",
            render: (user) => <Badge tone={statusTone(user.role)}>{titleCase(user.role)}</Badge>,
          },
          {
            key: "is_active",
            label: "Access",
            render: (user) => <Badge tone={user.is_active ? "green" : "red"}>{user.is_active ? "Active" : "Blocked"}</Badge>,
          },
          {
            key: "actions",
            label: "",
            render: (user) =>
              user.id === me?.id ? (
                <span className="text-xs text-zinc-400">You</span>
              ) : (
                <button type="button" className={quietButton} onClick={() => toggle(user)}>
                  {user.is_active ? "Block" : "Unblock"}
                </button>
              ),
          },
        ]}
      />
      <Pager page={page} total={count} onPage={setPage} />
    </div>
  );
}
