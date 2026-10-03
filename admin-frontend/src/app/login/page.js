"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccess } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@bookmyshow.test");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (getAccess()) router.replace("/");
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { api, saveSession } = await import("@/lib/api");
      const data = await api("/api/v1/admin/auth/login/", {
        method: "POST",
        body: { email, password },
      });
      saveSession(data);
      router.replace("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <section className="hidden bg-ink p-10 text-white md:flex md:flex-col md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-rose-300">Staff only</p>
          <h1 className="mt-4 max-w-sm text-4xl font-semibold leading-tight">BookMyShow admin</h1>
        </div>
        <p className="max-w-sm text-sm text-zinc-400">
          Movies, screens, shows, and bookings. Customer accounts cannot sign in here.
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-16">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <div className="md:hidden">
            <h1 className="text-2xl font-semibold">Staff login</h1>
          </div>
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Email</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Password</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            disabled={saving}
            type="submit"
          >
            {saving ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
