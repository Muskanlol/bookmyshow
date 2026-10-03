"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/app/notifications/page";
import { clearSession, getAccess, savedCity, savedUser } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [city, setCity] = useState(null);

  useEffect(() => {
    if (!getAccess()) {
      router.replace("/login?next=/settings");
      return;
    }
    setUser(savedUser());
    setCity(savedCity());
  }, [router]);

  if (!user) return <Shell title="Accounts & Settings"><p className="text-sm text-[#777]">Loading account…</p></Shell>;

  return (
    <Shell title="Accounts & Settings">
      <Row label="Name" value={user.name} />
      <Row label="Email" value={user.email} />
      <Row label="Phone" value={user.phone || "Not added"} />
      <Row label="Location" value={city ? `${city.name}, ${city.state}` : "Choose a city from the header"} />
      <article className="rounded-lg bg-white px-4 py-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-[#888]">Payments</p>
        <p className="mt-1 text-sm text-[#333]">Checkout uses a demo payment. Card numbers are not saved.</p>
      </article>
      <div className="flex gap-3">
        <Link href="/bookings" className="rounded bg-[#222] px-4 py-2 text-sm font-semibold text-white">Your orders</Link>
        <button
          type="button"
          className="rounded border border-brand px-4 py-2 text-sm font-semibold text-brand"
          onClick={() => {
            clearSession();
            router.push("/");
          }}
        >
          Sign out
        </button>
      </div>
    </Shell>
  );
}

function Row({ label, value }) {
  return (
    <article className="rounded-lg bg-white px-4 py-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#888]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#222]">{value}</p>
    </article>
  );
}
