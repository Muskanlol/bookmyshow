"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MovieForm, movieToForm, saveMovie } from "@/components/MovieForm";
import { Alert, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function EditMoviePage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [movie, setMovie] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/v1/admin/movies/${id}/`)
      .then(setMovie)
      .catch((err) => setError(err.message));
  }, [id]);

  return (
    <div>
      <PageHeader title={movie ? movie.title : "Movie"} subtitle="Edit details, cast, or poster." />
      <Alert>{error}</Alert>
      {movie ? (
        <MovieForm
          initial={movieToForm(movie)}
          posterUrl={movie.poster}
          submitLabel="Save changes"
          onSubmit={async (form, extras) => {
            await saveMovie(api, `/api/v1/admin/movies/${id}/`, "PATCH", form, extras);
            router.push("/movies");
          }}
        />
      ) : null}
    </div>
  );
}
