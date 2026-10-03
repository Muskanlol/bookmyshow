"use client";

import { offers, tone } from "@/lib/catalog";

export default function OffersPage() {
  return (
    <div className="min-h-[70vh] bg-[#f2f2f2]">
      <div className="mx-auto max-w-[1240px] px-5 py-6">
        <h1 className="text-2xl font-semibold text-[#222]">Offers</h1>
        <p className="mt-1 text-sm text-[#777]">SAVE50 and TAKE10 apply at checkout. The others are partner offers.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {offers().map((offer) => {
            const [from, via] = tone(offer.tone);
            return (
              <article key={offer.code} className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-4 shadow-sm">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: via }}>{offer.kind}</p>
                  <p className="mt-1 text-sm text-[#333]">{offer.text}</p>
                </div>
                <p className="shrink-0 rounded border border-dashed px-2 py-1 text-sm font-semibold" style={{ borderColor: from, color: from }}>
                  {offer.code}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
