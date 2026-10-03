"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Shell } from "@/app/notifications/page";
import { api, getAccess } from "@/lib/api";
import { offers } from "@/lib/catalog";

export default function RewardsPage() {
  const [stamps, setStamps] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const ok = Boolean(getAccess());
    setSignedIn(ok);
    if (!ok) return;
    api("/api/v1/bookings/")
      .then((rows) => setStamps(rows.filter((booking) => booking.status === "confirmed").length))
      .catch(() => setStamps(0));
  }, []);

  const usable = offers().filter((offer) => offer.works);

  return (
    <Shell title="Rewards">
      <article className="rounded-lg bg-white px-4 py-4 shadow-sm">
        <p className="text-sm text-[#666]">Confirmed bookings</p>
        <p className="mt-1 text-3xl font-semibold text-[#222]">{signedIn ? stamps : "—"}</p>
        {!signedIn ? <p className="mt-2 text-sm text-[#666]"><Link href="/login?next=/rewards" className="font-semibold text-brand">Sign in</Link> to see your stamps.</p> : null}
      </article>
      {usable.map((offer) => (
        <article key={offer.code} className="rounded-lg bg-white px-4 py-4 shadow-sm">
          <p className="font-semibold text-brand">{offer.code}</p>
          <p className="mt-1 text-sm text-[#555]">{offer.text}</p>
        </article>
      ))}
      <p className="text-sm text-[#777]">Stamps do not change the ticket price. Use SAVE50 or TAKE10 at checkout.</p>
    </Shell>
  );
}
