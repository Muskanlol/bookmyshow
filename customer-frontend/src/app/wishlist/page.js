"use client";

import { useEffect, useState } from "react";
import MovieCard from "@/components/MovieCard";
import { Shell } from "@/app/notifications/page";
import { api } from "@/lib/api";
import { wishlistIds } from "@/lib/saved";

export default function WishlistPage() {
  const [movies, setMovies] = useState(null);

  useEffect(() => {
    let cancel = false;
    const load = () => {
      api("/api/v1/movies/")
        .then((rows) => {
          if (cancel) return;
          const ids = new Set(wishlistIds());
          setMovies(rows.filter((movie) => ids.has(movie.id)));
        })
        .catch(() => setMovies([]));
    };
    load();
    window.addEventListener("bms-wishlist", load);
    return () => {
      cancel = true;
      window.removeEventListener("bms-wishlist", load);
    };
  }, []);

  return (
    <Shell title="Your Wishlist">
      {movies && movies.length === 0 ? <p className="text-sm text-[#777]">Tap the heart on a movie poster to save it here.</p> : null}
      <div className="flex flex-wrap gap-4">
        {(movies || []).map((movie) => <MovieCard key={movie.id} movie={movie} />)}
      </div>
    </Shell>
  );
}
