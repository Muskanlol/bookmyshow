"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Poster from "@/components/Poster";
import { api, getAccess } from "@/lib/api";
import { inr, showDay } from "@/lib/format";

export default function CheckoutPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(null);

  useEffect(() => {
    if (!getAccess()) {
      router.replace(`/login?next=/checkout/${id}`);
      return;
    }
    api(`/api/v1/bookings/${id}/`)
      .then((data) => {
        if (data.status !== "pending") {
          router.replace(`/bookings/${id}`);
          return;
        }
        setBooking(data);
        document.title = "Checkout | BookMyShow";
      })
      .catch((err) => setError(err.message));
  }, [id, router]);

  useEffect(() => {
    if (!booking?.expires_at) return undefined;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((new Date(booking.expires_at) - Date.now()) / 1000));
      setLeft(seconds);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [booking?.expires_at]);

  async function applyCoupon(event) {
    event.preventDefault();
    setError("");
    try {
      const data = await api(`/api/v1/bookings/${id}/quote/`, {
        method: "POST",
        body: { coupon_code: code },
      });
      setBooking(data);
      setApplied(code.trim().toUpperCase());
    } catch (err) {
      setError(err.message);
    }
  }

  async function clearCoupon() {
    const data = await api(`/api/v1/bookings/${id}/quote/`, {
      method: "POST",
      body: { coupon_code: "" },
    });
    setBooking(data);
    setApplied("");
    setCode("");
  }

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const data = await api(`/api/v1/bookings/${id}/pay/`, {
        method: "POST",
        body: { coupon_code: applied },
      });
      router.replace(`/bookings/${data.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (!booking) {
    return <p className="mx-auto max-w-3xl px-4 py-10 text-sm text-zinc-500">{error || "Loading checkout…"}</p>;
  }

  const minutes = left == null ? "--" : String(Math.floor(left / 60)).padStart(2, "0");
  const seconds = left == null ? "--" : String(left % 60).padStart(2, "0");
  const expired = left === 0;

  return (
    <div className="mx-auto grid max-w-[1000px] gap-5 px-4 py-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="flex gap-4">
          <div className="h-28 w-20 overflow-hidden rounded-lg">
            <Poster title={booking.movie_title} poster={booking.poster} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{booking.movie_title}</h1>
            <p className="mt-1 text-sm text-zinc-500">
              {booking.theatre_name} · {booking.screen_name} · {booking.city_name}
            </p>
            <p className="text-sm text-zinc-500">{showDay(booking.start_time)}</p>
            <p className="mt-2 text-sm font-medium">{booking.seats.map((seat) => seat.seat_label).join(", ")}</p>
          </div>
        </div>
        <dl className="mt-6 space-y-2 text-sm">
          <Row label="Tickets" value={inr(booking.subtotal)} />
          <Row label="Convenience fee" value={inr(booking.fee)} />
          {Number(booking.discount) > 0 ? <Row label="Discount" value={`- ${inr(booking.discount)}`} /> : null}
          <div className="flex justify-between border-t border-zinc-100 pt-3 text-base font-semibold">
            <dt>Amount payable</dt>
            <dd>{inr(booking.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="h-fit rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Seats held for</p>
        <p className={`mt-1 text-3xl font-semibold ${expired ? "text-brand" : "text-ink"}`}>{minutes}:{seconds}</p>
        <form onSubmit={applyCoupon} className="mt-5">
          <label className="text-sm font-medium" htmlFor="coupon">Coupon</label>
          <div className="mt-1 flex gap-2">
            <input
              id="coupon"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="SAVE50"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm uppercase outline-none focus:border-brand"
            />
            <button type="submit" className="rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Apply</button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Try SAVE50 or TAKE10</p>
          {applied ? (
            <button type="button" onClick={clearCoupon} className="mt-2 text-xs font-semibold text-brand">
              Remove {applied}
            </button>
          ) : null}
        </form>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <button
          type="button"
          disabled={busy || expired}
          onClick={pay}
          className="mt-5 w-full rounded-md bg-brand py-3 text-sm font-semibold text-white disabled:bg-zinc-300"
        >
          {expired ? "Hold expired" : busy ? "Paying…" : `Pay ${inr(booking.total)}`}
        </button>
        <p className="mt-3 text-center text-xs text-zinc-400">Demo payment. No card is charged.</p>
        {expired ? (
          <Link href={`/movies/${booking.movie_id}/book`} className="mt-3 block text-center text-sm font-semibold text-brand">
            Pick seats again
          </Link>
        ) : null}
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-zinc-600">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
