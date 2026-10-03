"use client";

import { use, useEffect, useMemo, useState } from "react";
import ListingCard from "@/components/ListingCard";
import { savedCity } from "@/lib/api";
import { categories, listings, SECTION_META } from "@/lib/catalog";

export default function ExplorePage({ params }) {
  const { section } = use(params);
  const meta = SECTION_META[section];
  const items = listings(section);
  const chips = categories(section);
  const [filter, setFilter] = useState("All");
  const [city, setCity] = useState(null);

  useEffect(() => {
    const sync = () => setCity(savedCity());
    sync();
    window.addEventListener("bms-city", sync);
    return () => window.removeEventListener("bms-city", sync);
  }, []);

  const visible = useMemo(
    () => items.filter((item) => filter === "All" || item.category === filter),
    [items, filter],
  );
  const layout = section === "gift-cards" ? "gift" : section === "stream" ? "poster" : "wide";
  const cityName = city?.name || "your city";

  if (!meta) {
    return <p className="px-6 py-16 text-sm text-[#666]">That section is not on BookMyShow.</p>;
  }

  return (
    <div className="min-h-[70vh] bg-[#f2f2f2]">
      <div className="mx-auto max-w-[1240px] px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">BookMyShow</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#222]">
          {meta.title} in {cityName}
        </h1>
        <p className="mt-1 text-sm text-[#777]">{visible.length} {meta.noun}</p>
        <div className="scroller mt-4 flex gap-2 overflow-x-auto pb-1">
          {["All", ...chips].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setFilter(chip)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${filter === chip ? "border-brand bg-brand text-white" : "border-[#ddd] bg-white text-[#333]"}`}
            >
              {chip}
            </button>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-6">
          {visible.map((item) => (
            <ListingCard key={item.slug} item={item} city={cityName} layout={layout} />
          ))}
        </div>
      </div>
    </div>
  );
}
