"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Poster from "@/components/Poster";
import { api, getAccess } from "@/lib/api";
import { inr, showDay } from "@/lib/format";

export default function TicketPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccess()) {
      router.replace(`/login?next=/bookings/${id}`);
      return;
    }
    api(`/api/v1/bookings/${id}/`)
      .then((data) => {
        if (data.status === "pending") {
          router.replace(`/checkout/${id}`);
          return;
        }
        setBooking(data);
        document.title = `${data.movie_title} ticket | BookMyShow`;
      })
      .catch((err) => setError(err.message));
  }, [id, router]);

  async function cancel() {
    if (!window.confirm("Cancel this booking and release the seats?")) return;
    try {
      const data = await api(`/api/v1/bookings/${id}/cancel/`, { method: "POST" });
      setBooking(data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!booking) {
    return <p className="mx-auto max-w-xl px-4 py-10 text-sm text-zinc-500">{error || "Loading ticket…"}</p>;
  }

  const confirmed = booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl bg-white shadow-lg">
        <div className="relative h-36">
          <Poster title={booking.movie_title} poster={booking.poster} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/10" />
          <div className="absolute bottom-4 left-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em]">{confirmed ? "Confirmed" : booking.status}</p>
            <h1 className="text-2xl font-semibold">{booking.movie_title}</h1>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 px-5 py-5 text-sm">
          <Field label="When" value={showDay(booking.start_time)} />
          <Field label="Where" value={`${booking.theatre_name}, ${booking.city_name}`} />
          <Field label="Screen" value={booking.screen_name} />
          <Field label="Seats" value={booking.seats.map((seat) => seat.seat_label).join(", ")} />
          <Field label="Paid" value={inr(booking.total)} />
          <Field label="Booking id" value={`BMS${booking.id}`} />
        </div>
        <div className="mx-5 border-t border-dashed border-zinc-300" />
        <div className="flex items-center justify-between px-5 py-4">
          <TicketMark id={booking.id} />
          <p className="max-w-[180px] text-right text-xs text-zinc-400">Show this screen at the theatre. Demo ticket, no real scan.</p>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4 flex items-center justify-between">
        <Link href="/bookings" className="text-sm font-semibold text-brand">All bookings</Link>
        {confirmed ? (
          <button type="button" onClick={cancel} className="text-sm text-zinc-500">Cancel booking</button>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function TicketMark({ id }) {
  const cells = Array.from({ length: 36 }, (_, index) => ((id * 17 + index * 13) % 7) > 2);
  return (
    <div className="grid grid-cols-6 gap-0.5" aria-hidden="true">
      {cells.map((on, index) => (
        <span key={index} className={`h-2 w-2 ${on ? "bg-ink" : "bg-zinc-200"}`} />
      ))}
    </div>
  );
}
