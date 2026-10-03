"use client";

import { palette, posterSrc } from "@/lib/art";

export default function Poster({ title, poster, className = "" }) {
  const src = posterSrc(title, poster);
  const [from, via, to] = palette(title);
  if (src) {
    return (
      <span className={`relative block h-full w-full overflow-hidden ${className}`}>
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </span>
    );
  }
  return (
    <div
      className={`relative h-full w-full ${className}`}
      style={{ background: `linear-gradient(160deg, ${from}, ${via} 55%, ${to})` }}
    >
      <span className="absolute inset-x-2 bottom-10 text-sm font-semibold uppercase leading-tight tracking-wide text-white">{title}</span>
    </div>
  );
}
