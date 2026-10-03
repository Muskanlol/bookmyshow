"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MovieCard from "@/components/MovieCard";
import { api } from "@/lib/api";

function MovieList() {
  const params = useSearchParams();
  const language = params.get("language") || "";
  const genre = params.get("genre") || "";
  const status = params.get("status") || "";
  const [movies, setMovies] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/movies/", { query: { language, genre, status } })
      .then(setMovies)
      .catch((err) => setError(err.message));
  }, [language, genre, status]);

  const title = status === "coming_soon"
    ? "Upcoming movies"
    : language
      ? `Movies in ${language}`
      : genre
        ? `${genre} movies`
        : "Movies";

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-8">
      <h1 className="text-2xl font-semibold text-[#222]">{title}</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <Filter href="/movies" active={!language && !genre && !status}>All</Filter>
        <Filter href="/movies?language=Hindi" active={language === "Hindi"}>Hindi</Filter>
        <Filter href="/movies?language=English" active={language === "English"}>English</Filter>
        <Filter href="/movies?language=Tamil" active={language === "Tamil"}>Tamil</Filter>
        <Filter href="/movies?genre=Drama" active={genre === "Drama"}>Drama</Filter>
        <Filter href="/movies?genre=Comedy" active={genre === "Comedy"}>Comedy</Filter>
        <Filter href="/movies?genre=Thriller" active={genre === "Thriller"}>Thriller</Filter>
        <Filter href="/movies?status=coming_soon" active={status === "coming_soon"}>Coming soon</Filter>
      </div>
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      <div className="mt-6 flex flex-wrap gap-5">
        {(movies || []).map((movie) => <MovieCard key={movie.id} movie={movie} />)}
      </div>
      {movies && movies.length === 0 ? <p className="mt-4 text-sm text-[#777]">No movies in this filter.</p> : null}
    </div>
  );
}

function Filter({ href, active, children }) {
  return (
    <a href={href} className={`rounded-full border px-3 py-1 ${active ? "border-brand bg-brand text-white" : "border-zinc-300 bg-white text-[#444]"}`}>
      {children}
    </a>
  );
}

export default function MoviesPage() {
  return (
    <Suspense fallback={<p className="px-5 py-10 text-sm text-[#777]">Loading movies…</p>}>
      <MovieList />
    </Suspense>
  );
}
