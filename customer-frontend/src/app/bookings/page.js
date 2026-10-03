"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getAccess } from "@/lib/api";
import { inr, showDay } from "@/lib/format";

export default function BookingsPage() {
  const router = useRouter();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccess()) {
      router.replace("/login?next=/bookings");
      return;
    }
    api("/api/v1/bookings/")
      .then(setRows)
      .catch((err) => setError(err.message));
  }, [router]);

  return (
    <div className="mx-auto max-w-[800px] px-4 py-6">
      <h1 className="text-2xl font-semibold">My bookings</h1>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4 space-y-3">
        {(rows || []).map((booking) => (
          <Link key={booking.id} href={booking.status === "pending" ? `/checkout/${booking.id}` : `/bookings/${booking.id}`} className="block rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{booking.movie_title}</p>
                <p className="mt-1 text-sm text-zinc-500">{booking.theatre_name} · {showDay(booking.start_time)}</p>
                <p className="text-sm text-zinc-500">{booking.seats.map((seat) => seat.seat_label).join(", ") || "Seats released"}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold capitalize">{booking.status}</p>
                <p className="text-sm text-zinc-500">{inr(booking.total)}</p>
              </div>
            </div>
          </Link>
        ))}
        {rows && rows.length === 0 ? <p className="text-sm text-zinc-500">You have not booked a ticket yet.</p> : null}
      </div>
    </div>
  );
}
