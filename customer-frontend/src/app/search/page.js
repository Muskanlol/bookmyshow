"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MovieCard from "@/components/MovieCard";
import ListingCard from "@/components/ListingCard";
import { api } from "@/lib/api";
import { searchListings } from "@/lib/catalog";

function Results() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [movies, setMovies] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/movies/", { query: { search: q } })
      .then(setMovies)
      .catch((err) => setError(err.message));
  }, [q]);

  const more = q ? searchListings(q) : [];

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6">
      <h1 className="text-2xl font-semibold">{q ? `Results for “${q}”` : "Movies"}</h1>
      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-4">
        {(movies || []).map((movie) => <MovieCard key={movie.id} movie={movie} />)}
      </div>
      {movies && movies.length === 0 ? <p className="mt-4 text-sm text-zinc-500">No movies matched that search.</p> : null}
      {more.length ? (
        <div className="mt-8">
          <h2 className="text-xl font-semibold">Events, plays, sports and more</h2>
          <div className="mt-4 flex flex-wrap gap-4">
            {more.map((item) => (
              <ListingCard key={`${item.section}-${item.slug}`} item={item} layout={item.section === "stream" ? "poster" : item.section === "gift-cards" ? "gift" : "wide"} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-zinc-500">Searching…</p>}>
      <Results />
    </Suspense>
  );
}
