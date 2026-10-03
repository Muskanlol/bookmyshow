"use client";

import Link from "next/link";
import { posterSrc } from "@/lib/art";
import { tone, venueLabel, whenLabel } from "@/lib/catalog";
import { inr } from "@/lib/format";

export default function ListingCard({ item, city, layout = "wide" }) {
  const [from, via, to] = tone(item.tone);
  const wide = layout === "wide";
  const gift = layout === "gift";
  const src = posterSrc(item.title);
  return (
    <Link href={`/explore/${item.section}/${item.slug}`} className={`group shrink-0 ${gift ? "w-[240px]" : wide ? "w-[210px]" : "w-[146px] sm:w-[158px]"}`}>
      <div
        className={`relative overflow-hidden rounded-lg bg-zinc-800 shadow-sm ${gift ? "aspect-[1.6/1]" : wide ? "aspect-[16/10]" : "aspect-[2/3]"}`}
        style={src ? undefined : { background: `linear-gradient(160deg, ${from}, ${via} 55%, ${to})` }}
      >
        {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-black/10" />
        <p className="absolute left-2 top-2 rounded bg-white/95 px-1.5 py-0.5 text-[11px] font-semibold text-[#222]">
          {gift ? item.category : whenLabel(item)}
        </p>
        <p className={`absolute inset-x-2 font-semibold uppercase leading-tight tracking-wide text-white ${gift ? "bottom-3 text-base" : wide ? "bottom-2 text-sm" : "bottom-8 text-sm"}`}>
          {gift ? inr(item.price) : item.title}
        </p>
      </div>
      <p className="mt-2 truncate text-[15px] font-semibold text-[#222]">{item.title}</p>
      <p className="truncate text-xs text-[#666]">{venueLabel(item, city)}</p>
      {gift ? null : <p className="truncate text-xs text-[#888]">{item.category} · {inr(item.price)} onwards</p>}
    </Link>
  );
}
