"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import { savedCity } from "@/lib/api";
import { posterSrc } from "@/lib/art";
import { aboutLabel, findListing, listings, SECTION_META, tone, venueLabel, whenLabel } from "@/lib/catalog";
import { inr } from "@/lib/format";
import { inLibrary, toggleLibrary } from "@/lib/saved";

export default function ListingPage({ params }) {
  const { section, slug } = use(params);
  const item = findListing(section, slug);
  const meta = SECTION_META[section];
  const [city, setCity] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [savedStream, setSavedStream] = useState(false);

  useEffect(() => {
    const sync = () => setCity(savedCity());
    sync();
    window.addEventListener("bms-city", sync);
    return () => window.removeEventListener("bms-city", sync);
  }, []);

  const image = item ? posterSrc(item.title) : null;
  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  useEffect(() => {
    if (!item || section !== "stream") return undefined;
    const sync = () => setSavedStream(inLibrary(item.slug));
    sync();
    window.addEventListener("bms-library", sync);
    return () => window.removeEventListener("bms-library", sync);
  }, [item, section]);

  if (!item || !meta) {
    return <p className="px-6 py-16 text-sm text-[#666]">That listing is not available.</p>;
  }

  const cityName = city?.name || "your city";
  const [from, via, to] = tone(item.tone);
  const more = listings(section).filter((row) => row.slug !== item.slug).slice(0, 8);
  const layout = section === "gift-cards" ? "gift" : section === "stream" ? "poster" : "wide";
  const showImage = Boolean(image) && !imageFailed;

  return (
    <div className="bg-[#f2f2f2]">
      <section className="relative min-h-[280px] overflow-hidden bg-[#1a1a1a] text-white sm:min-h-[340px]">
        {showImage ? (
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${from}, ${via}, ${to})` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-black/10" />
        <div className="relative mx-auto flex min-h-[280px] max-w-[1240px] items-end px-5 py-8 sm:min-h-[340px]">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {meta.title} · {item.category}{item.language ? ` · ${item.language}` : ""}
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{item.title}</h1>
            <p className="mt-2 text-sm text-white/85">{whenLabel(item)} · {venueLabel(item, cityName)}</p>
            <p className="mt-4 text-lg font-semibold">{inr(item.price)} onwards</p>
            {section === "stream" ? (
              <button type="button" onClick={() => toggleLibrary(item.slug)} className="mt-4 rounded bg-white px-4 py-2 text-sm font-semibold text-[#222]">
                {savedStream ? "Saved to library" : "Save to library"}
              </button>
            ) : null}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-[1240px] px-5 py-8">
        <Link href={`/explore/${section}`} className="text-sm text-brand">‹ All {meta.title.toLowerCase()}</Link>
        <h2 className="mt-4 text-xl font-semibold text-[#222]">About</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#555]">{aboutLabel(item, cityName)}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Fact label="Where" value={venueLabel(item, cityName)} />
          <Fact label="When" value={whenLabel(item)} />
          <Fact label="Price" value={`${inr(item.price)} onwards`} />
        </div>
        <h2 className="mb-4 mt-10 text-xl font-semibold text-[#222]">More in {meta.title}</h2>
        <div className="scroller flex gap-4 overflow-x-auto pb-2">
          {more.map((row) => <ListingCard key={row.slug} item={row} city={cityName} layout={layout} />)}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#888]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#222]">{value}</p>
    </div>
  );
}
