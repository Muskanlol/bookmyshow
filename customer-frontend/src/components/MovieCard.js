"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Poster from "@/components/Poster";
import { inWishlist, toggleWishlist } from "@/lib/saved";

export default function MovieCard({ movie, href, onDark = false }) {
  const score = Number(movie.avg_rating || 0);
  const label = score ? `${(score * 2).toFixed(1)}/10` : "New";
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(inWishlist(movie.id));
    sync();
    window.addEventListener("bms-wishlist", sync);
    return () => window.removeEventListener("bms-wishlist", sync);
  }, [movie.id]);

  return (
    <div className="group relative w-[146px] shrink-0 sm:w-[158px]">
      <button
        type="button"
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        onClick={() => toggleWishlist(movie.id)}
        className={`absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/45 text-sm ${saved ? "text-brand" : "text-white"}`}
      >
        {saved ? "♥" : "♡"}
      </button>
      <Link href={href || `/movies/${movie.id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-200 shadow-sm">
          <Poster title={movie.title} poster={movie.poster} className="transition duration-300 group-hover:scale-[1.03]" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2.5 pb-2 pt-12 text-white">
            <p className="flex items-center gap-1 text-sm font-semibold">
              <Star />
              {label}
            </p>
          </div>
        </div>
        <p className={`mt-2 truncate text-[15px] font-semibold ${onDark ? "text-white" : "text-[#222]"}`}>{movie.title}</p>
        <p className={`truncate text-xs ${onDark ? "text-white/60" : "text-[#666]"}`}>{movie.genre}</p>
      </Link>
    </div>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-[#f84464]" aria-hidden="true">
      <path d="M10 1.8 12.4 7l5.6.5-4.3 3.6 1.3 5.4L10 13.8 4.9 16.5l1.4-5.4L2 7.5 7.6 7 10 1.8Z" />
    </svg>
  );
}
