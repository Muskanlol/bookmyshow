"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getAccess } from "@/lib/api";
import { inr, showDay } from "@/lib/format";

const TIER_STYLE = {
  premier: "border-[#e0a100] bg-[#fff8e8] text-[#8a6500]",
  gold: "border-[#f84464] bg-white text-[#c22542]",
  silver: "border-[#3d9ad6] bg-white text-[#1d6fa3]",
};

export default function SeatPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [map, setMap] = useState(null);
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(`bms_pick_${id}`);
    if (saved) {
      try {
        setPicked(JSON.parse(saved));
      } catch {
        setPicked([]);
      }
    }
    api(`/api/v1/shows/${id}/seats/`)
      .then((data) => {
        setMap(data);
        document.title = `${data.show.movie.title} seats | BookMyShow`;
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const rows = useMemo(() => {
    const grouped = new Map();
    (map?.seats || []).forEach((seat) => {
      if (!grouped.has(seat.row_index)) grouped.set(seat.row_index, []);
      grouped.get(seat.row_index).push(seat);
    });
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, cells]) => cells.sort((a, b) => a.col_index - b.col_index));
  }, [map]);

  const selected = (map?.seats || []).filter((seat) => picked.includes(seat.id) && seat.status === "available");
  const total = selected.reduce((sum, seat) => sum + Number(seat.price || 0), 0);

  function toggle(seat) {
    if (seat.status !== "available") return;
    setPicked((current) => {
      const next = current.includes(seat.id)
        ? current.filter((item) => item !== seat.id)
        : current.length >= 10
          ? current
          : [...current, seat.id];
      sessionStorage.setItem(`bms_pick_${id}`, JSON.stringify(next));
      return next;
    });
  }

  async function proceed() {
    if (!selected.length) return;
    if (!getAccess()) {
      router.push(`/login?next=/shows/${id}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const booking = await api("/api/v1/bookings/hold/", {
        method: "POST",
        body: { show: Number(id), seat_ids: selected.map((seat) => seat.id) },
      });
      sessionStorage.removeItem(`bms_pick_${id}`);
      router.push(`/checkout/${booking.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const show = map?.show;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 pb-28">
      {show ? (
        <div className="mb-5">
          <Link href={`/movies/${show.movie.id}/book`} className="text-sm text-zinc-500">All showtimes</Link>
          <h1 className="mt-1 text-2xl font-semibold">{show.movie.title}</h1>
          <p className="text-sm text-zinc-500">
            {show.theatre.name} · {show.screen.name} · {show.theatre.city} · {showDay(show.start_time)}
          </p>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">{error || "Loading seats…"}</p>
      )}

      {show ? (
        <div className="rounded-3xl bg-white px-3 py-6 shadow-sm">
          <div className="mx-auto mb-8 w-[min(520px,80%)]">
            <div className="h-2 rounded-t-[100%] bg-gradient-to-b from-zinc-300 to-transparent shadow-[0_12px_24px_rgba(0,0,0,0.12)]" />
            <p className="mt-2 text-center text-[11px] font-semibold tracking-[0.28em] text-zinc-400">SCREEN</p>
          </div>
          <div className="overflow-x-auto">
            <div className="mx-auto w-max space-y-2">
              {rows.map((cells) => (
                <div key={cells[0].row_index} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-semibold text-zinc-400">{cells[0].row_label}</span>
                  <div className="flex gap-1.5">
                    {cells.map((seat) => (
                      <Seat key={seat.id} seat={seat} selected={picked.includes(seat.id)} onClick={() => toggle(seat)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-zinc-500">
            {(show.prices || []).map((row) => (
              <span key={row.tier} className="flex items-center gap-1.5">
                <i className={`inline-block h-3.5 w-3.5 rounded-sm border ${TIER_STYLE[row.tier] || "border-zinc-300"}`} />
                {row.tier[0].toUpperCase()}{row.tier.slice(1)} {inr(row.price)}
              </span>
            ))}
            <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded-sm bg-[#1ea83c]" /> Selected</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded-sm bg-zinc-200" /> Sold</span>
          </div>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">
              {selected.length ? selected.map((seat) => seat.label).join(", ") : "No seats selected"}
            </p>
            <p className="text-xs text-zinc-500">{error || (selected.length ? inr(total) : "Pick up to 10 seats")}</p>
          </div>
          <button
            type="button"
            disabled={!selected.length || busy}
            onClick={proceed}
            className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:bg-zinc-300"
          >
            {busy ? "Holding…" : "Proceed"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Seat({ seat, selected, onClick }) {
  if (seat.status === "aisle") {
    return <span className="h-7 w-7" />;
  }
  const unavailable = seat.status === "booked" || seat.status === "blocked" || seat.status === "held";
  const chosen = selected && seat.status === "available";
  const tone = chosen
    ? "border-[#1ea83c] bg-[#1ea83c] text-white"
    : unavailable
      ? "cursor-not-allowed border-zinc-200 bg-zinc-200 text-transparent"
      : TIER_STYLE[seat.tier] || "border-zinc-300 bg-white";
  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onClick}
      aria-label={`${seat.label || "Aisle"} ${seat.tier} ${seat.status}`}
      className={`h-7 w-7 rounded-t-md rounded-b-sm border text-[9px] font-semibold ${tone}`}
    >
      {unavailable ? "" : seat.number}
    </button>
  );
}
