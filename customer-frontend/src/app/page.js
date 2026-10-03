"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MovieCard from "@/components/MovieCard";
import ListingCard from "@/components/ListingCard";
import Poster from "@/components/Poster";
import { api, savedCity } from "@/lib/api";
import { listings } from "@/lib/catalog";
import { duration, showTime } from "@/lib/format";

export default function HomePage() {
  const [movies, setMovies] = useState(null);
  const [error, setError] = useState("");
  const [slide, setSlide] = useState(0);
  const [city, setCity] = useState(null);
  const [cinemas, setCinemas] = useState(null);

  useEffect(() => {
    api("/api/v1/movies/")
      .then(setMovies)
      .catch((err) => setError(err.message));
    const sync = () => setCity(savedCity());
    sync();
    window.addEventListener("bms-city", sync);
    return () => window.removeEventListener("bms-city", sync);
  }, []);

  const nowShowing = useMemo(
    () => (movies || []).filter((movie) => movie.status === "now_showing"),
    [movies],
  );
  const coming = useMemo(
    () => (movies || []).filter((movie) => movie.status === "coming_soon"),
    [movies],
  );
  const bookableIds = useMemo(() => {
    const ids = new Set();
    (cinemas || []).forEach((theatre) => {
      theatre.movies.forEach((movie) => ids.add(movie.id));
    });
    return ids;
  }, [cinemas]);
  const bannerMovies = bookableIds.size
    ? nowShowing.filter((movie) => bookableIds.has(movie.id))
    : nowShowing;

  useEffect(() => {
    if (bannerMovies.length < 2) return undefined;
    const timer = setInterval(() => setSlide((index) => (index + 1) % bannerMovies.length), 5500);
    return () => clearInterval(timer);
  }, [bannerMovies.length]);

  useEffect(() => {
    if (!city || !nowShowing.length) return undefined;
    let cancel = false;
    Promise.all(
      nowShowing.map((movie) =>
        api(`/api/v1/movies/${movie.id}/shows/`, { query: { city: city.id } }).catch(() => null),
      ),
    ).then((rows) => {
      if (cancel) return;
      const grouped = new Map();
      rows.filter(Boolean).forEach((payload) => {
        (payload.theatres || []).forEach((theatre) => {
          const current = grouped.get(theatre.id) || {
            id: theatre.id,
            name: theatre.name,
            address: theatre.address,
            amenities: theatre.amenities || [],
            movies: [],
          };
          if (theatre.shows[0]) {
            current.movies.push({
              id: payload.movie.id,
              title: payload.movie.title,
              time: theatre.shows[0].start_time,
              showId: theatre.shows[0].id,
            });
          }
          grouped.set(theatre.id, current);
        });
      });
      setCinemas([...grouped.values()]);
    });
    return () => {
      cancel = true;
    };
  }, [city, nowShowing]);

  return (
    <div className="bg-[#f2f2f2]">
      <section className="bg-[#f5f5f5] pt-4">
        {bannerMovies.length ? (
          <Banner movies={bannerMovies} slide={slide} onSlide={setSlide} />
        ) : (
          <div className="mx-auto h-[220px] max-w-[1240px] animate-pulse rounded-xl bg-white" />
        )}
      </section>

      <div className="mx-auto max-w-[1240px] px-5 py-5">
        {error ? <p className="mb-4 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <Rail title="Recommended Movies" href="/movies" movies={nowShowing} />
        <Rail title="Hindi" href="/movies?language=Hindi" movies={nowShowing.filter((movie) => movie.language === "Hindi")} />
        <Rail title="English" href="/movies?language=English" movies={nowShowing.filter((movie) => movie.language === "English")} />
        <Rail title="Tamil" href="/movies?language=Tamil" movies={nowShowing.filter((movie) => movie.language === "Tamil")} />

        <ListingRail title={city ? `Events in ${city.name}` : "Events"} href="/explore/events" items={listings("events")} city={city?.name} />
        <ListingRail title={city ? `Plays in ${city.name}` : "Plays"} href="/explore/plays" items={listings("plays")} city={city?.name} />
        <ListingRail title={city ? `Sports in ${city.name}` : "Sports"} href="/explore/sports" items={listings("sports")} city={city?.name} />
        <ListingRail title={city ? `Activities in ${city.name}` : "Activities"} href="/explore/activities" items={listings("activities")} city={city?.name} />
        <ListingRail title="Stream" href="/explore/stream" items={listings("stream")} city={city?.name} layout="poster" />

        <section id="offers" className="mt-10">
          <SectionTitle title="Offers" href="/offers" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Offer code="SAVE50" text="Flat ₹50 off on your ticket total" />
            <Offer code="TAKE10" text="10% off when you pay" />
          </div>
        </section>
      </div>

      {coming.length ? (
        <section className="bg-[#2b3148] py-8 text-white">
          <div className="mx-auto max-w-[1240px] px-5">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Premiere</p>
                <h2 className="text-2xl font-semibold">Coming soon</h2>
              </div>
              <Link href="/movies?status=coming_soon" className="text-sm text-brand">See All ›</Link>
            </div>
            <div className="scroller flex gap-5 overflow-x-auto pb-2">
              {coming.map((movie) => <MovieCard key={movie.id} movie={movie} onDark />)}
            </div>
          </div>
        </section>
      ) : null}

      <section id="cinemas" className="mx-auto max-w-[1240px] px-5 py-8">
        <SectionTitle title={city ? `Cinemas in ${city.name}` : "Cinemas"} href="/movies" />
        <div className="grid gap-3">
          {(cinemas || []).map((theatre) => (
            <article key={theatre.id} className="rounded-lg bg-white px-4 py-4 shadow-sm">
              <h3 className="font-semibold text-[#222]">{theatre.name}</h3>
              <p className="mt-1 text-sm text-[#777]">{theatre.address}</p>
              {theatre.amenities.length ? <p className="mt-1 text-xs text-[#999]">{theatre.amenities.join(" · ")}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {theatre.movies.map((movie) => (
                  <Link key={`${theatre.id}-${movie.showId}`} href={`/shows/${movie.showId}`} className="rounded border border-[#2fa84f] px-3 py-1.5 text-sm text-[#1f8a3b] hover:bg-[#2fa84f] hover:text-white">
                    {movie.title} · {showTime(movie.time)}
                  </Link>
                ))}
              </div>
            </article>
          ))}
          {cinemas && cinemas.length === 0 ? (
            <p className="rounded-lg bg-white px-4 py-6 text-sm text-[#777]">No shows in {city.name} right now. Try another city.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Banner({ movies, slide, onSlide }) {
  const count = movies.length;
  const index = slide % count;
  const current = movies[index];
  const prev = movies[(index - 1 + count) % count];
  const next = movies[(index + 1) % count];
  return (
    <div className="relative">
      <div className="flex h-[220px] items-stretch gap-2 sm:h-[300px] sm:gap-3">
        {count > 1 ? <Peek movie={prev} side="left" /> : null}
        <div className={`relative min-w-0 overflow-hidden sm:rounded-xl ${count > 1 ? "w-[86%] shrink-0 sm:w-[70%]" : "w-full"}`}>
          <Poster title={current.title} poster={current.poster} />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/15 to-transparent" />
          <div className="absolute inset-y-0 left-0 flex max-w-xl flex-col justify-end p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
              {current.certificate} · {current.language} · {duration(current.duration_min)}
            </p>
            <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{current.title}</h1>
            <p className="mt-1 text-sm text-white/85">{current.genre}</p>
            <Link href={`/movies/${current.id}/book`} className="mt-3 inline-flex w-fit rounded bg-brand px-4 py-2 text-sm font-semibold">
              Book tickets
            </Link>
          </div>
        </div>
        {count > 1 ? <Peek movie={next} side="right" /> : null}
      </div>
      {count > 1 ? (
        <>
          <button type="button" aria-label="Previous" onClick={() => onSlide((value) => (value - 1 + count) % count)} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-lg text-[#333] shadow sm:grid">‹</button>
          <button type="button" aria-label="Next" onClick={() => onSlide((value) => (value + 1) % count)} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white text-lg text-[#333] shadow sm:grid">›</button>
        </>
      ) : null}
    </div>
  );
}

function Peek({ movie, side }) {
  return (
    <div className={`relative hidden min-w-0 flex-1 overflow-hidden sm:block ${side === "left" ? "rounded-r-xl" : "rounded-l-xl"}`}>
      <Poster title={movie.title} poster={movie.poster} />
    </div>
  );
}

function Rail({ title, href, movies }) {
  if (!movies?.length) return null;
  return (
    <section className="mb-8">
      <SectionTitle title={title} href={href} />
      <div className="scroller flex gap-4 overflow-x-auto pb-1">
        {movies.map((movie) => <MovieCard key={movie.id} movie={movie} />)}
      </div>
    </section>
  );
}

function ListingRail({ title, href, items, city, layout = "wide" }) {
  return (
    <section className="mb-8">
      <SectionTitle title={title} href={href} />
      <div className="scroller flex gap-4 overflow-x-auto pb-1">
        {items.map((item) => <ListingCard key={item.slug} item={item} city={city} layout={layout} />)}
      </div>
    </section>
  );
}

function SectionTitle({ title, href }) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="text-2xl font-semibold text-[#222]">{title}</h2>
      {href ? <Link href={href} className="text-sm text-brand">See All ›</Link> : null}
    </div>
  );
}

function Offer({ code, text }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-4 py-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Offer</p>
        <p className="mt-1 text-sm text-[#555]">{text}</p>
      </div>
      <p className="rounded border border-dashed border-brand px-2 py-1 text-sm font-semibold text-brand">{code}</p>
    </div>
  );
}
