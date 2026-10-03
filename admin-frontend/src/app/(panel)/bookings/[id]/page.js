"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { inr, titleCase, when } from "@/lib/format";
import { Alert, Badge, PageHeader, buttonClass, quietButton, statusTone } from "@/components/ui";

export default function BookingDetailPage({ params }) {
  const { id } = use(params);
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api(`/api/v1/admin/bookings/${id}/`)
      .then(setBooking)
      .catch((err) => setError(err.message));
  }, [id]);

  async function cancel() {
    if (!confirm("Cancel this booking and release the seats?")) return;
    setSaving(true);
    try {
      const data = await api(`/api/v1/admin/bookings/${id}/cancel/`, { method: "POST" });
      setBooking(data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!booking) return <Alert>{error || "Loading booking…"}</Alert>;

  return (
    <div>
      <PageHeader
        title={`Booking ${booking.id}`}
        subtitle={`${booking.user_name} · ${booking.user_phone || booking.user_email}`}
        action={
          <Link href="/bookings" className={quietButton}>
            All bookings
          </Link>
        }
      />
      <Alert>{error}</Alert>
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Badge tone={statusTone(booking.status)}>{titleCase(booking.status)}</Badge>
            <span className="text-sm text-zinc-500">{when(booking.start_time)}</span>
          </div>
          <p className="text-lg font-semibold">{booking.movie_title}</p>
          <p className="text-sm text-zinc-600">
            {booking.theatre_name} · {booking.screen_name} · {booking.city_name}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {booking.seats.map((seat) => (
              <span
                key={seat.id}
                className={`rounded-lg px-3 py-1 text-sm ${seat.is_active ? "bg-zinc-100" : "bg-zinc-100 text-zinc-400 line-through"}`}
              >
                {seat.seat_label} · {inr(seat.price)}
              </span>
            ))}
          </div>
          {booking.status === "confirmed" || booking.status === "pending" ? (
            <button type="button" className={`${buttonClass} mt-5`} disabled={saving} onClick={cancel}>
              {saving ? "Cancelling…" : "Cancel and refund"}
            </button>
          ) : null}
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-semibold">Payment</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{inr(booking.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Fee</dt><dd>{inr(booking.fee)}</dd></div>
            <div className="flex justify-between"><dt>Discount</dt><dd>{inr(booking.discount)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{inr(booking.total)}</dd></div>
          </dl>
          <ul className="mt-4 space-y-2">
            {booking.payments.map((payment) => (
              <li key={payment.id} className="flex items-center justify-between">
                <span>{payment.provider}</span>
                <Badge tone={statusTone(payment.status)}>{titleCase(payment.status)}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
