"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, safeNext, saveSession } from "@/lib/api";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/v1/auth/register/", { method: "POST", body: form });
      saveSession(data);
      router.replace(next);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-zinc-500">Book tickets with your own profile.</p>
      {[
        ["name", "Name", "text"],
        ["email", "Email", "email"],
        ["phone", "Phone", "tel"],
        ["password", "Password", "password"],
      ].map(([key, label, type]) => (
        <div key={key}>
          <label className="mt-3 block text-sm font-medium" htmlFor={key}>{label}</label>
          <input
            id={key}
            type={type}
            required={key !== "phone"}
            value={form[key]}
            onChange={(event) => set(key, event.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-brand"
          />
        </div>
      ))}
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <button type="submit" disabled={busy} className="mt-5 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white disabled:bg-zinc-300">
        {busy ? "Creating…" : "Create account"}
      </button>
      <p className="mt-4 text-sm text-zinc-500">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-brand">Sign in</Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
