"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, getAccess, safeNext, saveSession } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("customer@bookmyshow.test");
  const [password, setPassword] = useState("Customer@12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getAccess()) router.replace(next);
  }, [next, router]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api("/api/v1/auth/login/", { method: "POST", body: { email, password } });
      saveSession(data);
      router.replace(next);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-lg font-semibold">book<span className="text-brand">my</span>show</p>
      <h1 className="mt-4 text-2xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-zinc-500">Use your customer account to hold seats and pay.</p>
      <label className="mt-5 block text-sm font-medium" htmlFor="email">Email</label>
      <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-brand" />
      <label className="mt-3 block text-sm font-medium" htmlFor="password">Password</label>
      <input id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-brand" />
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <button type="submit" disabled={busy} className="mt-5 w-full rounded-md bg-brand py-2.5 text-sm font-semibold text-white disabled:bg-zinc-300">
        {busy ? "Signing in…" : "Sign in"}
      </button>
      <p className="mt-4 text-sm text-zinc-500">
        New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-brand">Create an account</Link>
      </p>
      <p className="mt-3 text-xs text-zinc-400">Demo login: customer@bookmyshow.test / Customer@12345</p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
