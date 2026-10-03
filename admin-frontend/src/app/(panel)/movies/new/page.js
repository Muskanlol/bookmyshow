"use client";

import { useRouter } from "next/navigation";
import { MovieForm, saveMovie } from "@/components/MovieForm";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function NewMoviePage() {
  const router = useRouter();
  return (
    <div>
      <PageHeader title="New movie" subtitle="Add a poster and cast photos if you have them." />
      <MovieForm
        submitLabel="Create movie"
        onSubmit={async (form, extras) => {
          await saveMovie(api, "/api/v1/admin/movies/", "POST", form, extras);
          router.push("/movies");
        }}
      />
    </div>
  );
}
