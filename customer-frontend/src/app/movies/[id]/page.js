"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import Poster from "@/components/Poster";
import { api, getAccess } from "@/lib/api";
import { duration, ratingText, releaseLabel } from "@/lib/format";

export default function MoviePage({ params }) {
  const { id } = use(params);
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => setSignedIn(Boolean(getAccess()));
    sync();
    window.addEventListener("bms-auth", sync);
    return () => window.removeEventListener("bms-auth", sync);
  }, []);

  useEffect(() => {
    api(`/api/v1/movies/${id}/`)
      .then((data) => {
        setMovie(data);
        document.title = `${data.title} | BookMyShow`;
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function submitReview(event) {
    event.preventDefault();
    setReviewError("");
    try {
      const review = await api(`/api/v1/movies/${id}/reviews/`, {
        method: "POST",
        body: { rating, text },
      });
      setMovie((current) => ({
        ...current,
        avg_rating: review.avg_rating,
        reviews: [review, ...(current.reviews || []).filter((item) => item.id !== review.id)],
      }));
      setText("");
    } catch (err) {
      setReviewError(err.message);
    }
  }

  if (!movie) {
    return <p className="mx-auto max-w-[1200px] px-4 py-10 text-sm text-zinc-500">{error || "Loading movie…"}</p>;
  }

  const bookable = movie.status === "now_showing";

  return (
    <div>
      <section className="relative overflow-hidden bg-[#161616] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <Poster title={movie.title} poster={movie.poster} className="scale-110 blur-2xl" />
        </div>
        <div className="relative mx-auto grid max-w-[1200px] gap-6 px-4 py-8 md:grid-cols-[220px_1fr] md:py-10">
          <div className="relative aspect-[2/3] w-full max-w-[220px] overflow-hidden rounded-xl shadow-2xl">
            <Poster title={movie.title} poster={movie.poster} />
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-sm text-white/70">{movie.genre}</p>
            <h1 className="mt-1 text-4xl font-semibold">{movie.title}</h1>
            <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm">
              <span className="font-semibold text-[#ff5c7a]">{ratingText(movie.avg_rating)}/5</span>
              audience rating
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Meta>{movie.certificate}</Meta>
              <Meta>{movie.language}</Meta>
              <Meta>{duration(movie.duration_min)}</Meta>
              <Meta>{releaseLabel(movie.release_date)}</Meta>
            </div>
            {bookable ? (
              <Link
                href={`/movies/${id}/book`}
                className="mt-6 inline-flex w-fit rounded-md bg-brand px-6 py-3 text-sm font-semibold"
              >
                Book tickets
              </Link>
            ) : (
              <p className="mt-6 text-sm text-white/80">Releasing {releaseLabel(movie.release_date)}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1200px] px-4 py-8">
        <h2 className="text-xl font-semibold">About the movie</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">{movie.description}</p>

        <h2 className="mt-8 text-xl font-semibold">Cast</h2>
        <div className="mt-3 flex gap-4 overflow-x-auto">
          {(movie.cast || []).map((person) => (
            <div key={person.id} className="w-20 shrink-0 text-center">
              <div className="mx-auto h-16 w-16 overflow-hidden rounded-full bg-zinc-200">
                {person.photo ? (
                  <img src={person.photo} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-lg font-semibold text-zinc-600">
                    {person.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm font-medium">{person.name}</p>
              <p className="text-xs text-zinc-500">{person.role}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-8 text-xl font-semibold">Reviews</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(movie.reviews || []).map((review) => (
            <article key={review.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold">{review.name} · {review.rating}/5</p>
              <p className="mt-1 text-sm text-zinc-600">{review.text}</p>
            </article>
          ))}
        </div>
        {signedIn ? (
          <form onSubmit={submitReview} className="mt-4 max-w-lg rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold">Rate this movie</p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`h-9 w-9 rounded-full text-sm font-semibold ${
                    rating === value ? "bg-brand text-white" : "bg-zinc-100"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="What did you think?"
              className="mt-3 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand"
              rows={3}
            />
            {reviewError ? <p className="mt-2 text-sm text-rose-600">{reviewError}</p> : null}
            <button type="submit" className="mt-3 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white">
              Post review
            </button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            <Link href={`/login?next=/movies/${id}`} className="font-semibold text-brand">Sign in</Link> to rate this movie.
          </p>
        )}
      </div>
    </div>
  );
}

function Meta({ children }) {
  return <span className="rounded border border-white/20 px-2 py-1">{children}</span>;
}
