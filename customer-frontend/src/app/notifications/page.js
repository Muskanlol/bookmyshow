"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, getAccess } from "@/lib/api";
import { showDay } from "@/lib/format";

export default function NotificationsPage() {
  const [rows, setRows] = useState(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const ok = Boolean(getAccess());
    setSignedIn(ok);
    if (!ok) return;
    api("/api/v1/bookings/").then(setRows).catch(() => setRows([]));
  }, []);

  const upcoming = (rows || []).filter((booking) => booking.status === "confirmed" || booking.status === "pending");

  return (
    <Shell title="Notifications">
      <Note title="Offers are live" text="SAVE50 takes ₹50 off the ticket total. TAKE10 takes 10% off. Apply either code at checkout." href="/offers" />
      {!signedIn ? (
        <Note title="Sign in for booking alerts" text="We’ll list payment reminders and upcoming shows here." href="/login?next=/notifications" />
      ) : null}
      {signedIn && rows && upcoming.length === 0 ? <p className="text-sm text-[#777]">No booking alerts right now.</p> : null}
      {upcoming.map((booking) => (
        <Note
          key={booking.id}
          title={booking.status === "pending" ? `Finish payment for ${booking.movie_title}` : `${booking.movie_title} is booked`}
          text={`${booking.theatre_name} · ${showDay(booking.start_time)}`}
          href={booking.status === "pending" ? `/checkout/${booking.id}` : `/bookings/${booking.id}`}
        />
      ))}
    </Shell>
  );
}

export function Shell({ title, children }) {
  return (
    <div className="mx-auto min-h-[70vh] max-w-[760px] px-5 py-8">
      <h1 className="text-2xl font-semibold text-[#222]">{title}</h1>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

export function Note({ title, text, href }) {
  const body = (
    <article className="rounded-lg bg-white px-4 py-4 shadow-sm">
      <p className="font-semibold text-[#222]">{title}</p>
      <p className="mt-1 text-sm text-[#666]">{text}</p>
    </article>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}
