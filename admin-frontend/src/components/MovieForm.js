"use client";

import { useEffect, useState } from "react";
import { Alert, Field, buttonClass, inputClass, quietButton } from "@/components/ui";

const CERTIFICATES = ["U", "UA", "A", "S"];
const STATUSES = [
  { value: "coming_soon", label: "Coming Soon" },
  { value: "now_showing", label: "Now Showing" },
  { value: "ended", label: "Ended" },
];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE = 5 * 1024 * 1024;

const emptyMovie = {
  title: "",
  description: "",
  duration_min: 120,
  language: "",
  genre: "",
  certificate: "UA",
  release_date: "",
  trailer_url: "",
  status: "now_showing",
  cast: [{ name: "", role: "Actor", photoUrl: "", clear_photo: false }],
};

function imageProblem(file) {
  if (!file) return "";
  if (file.type && !IMAGE_TYPES.includes(file.type)) return "Use a JPG, PNG, or WebP image.";
  if (file.size > MAX_IMAGE) return "Image must be 5 MB or smaller.";
  if (file.size < 1) return "That image file is empty.";
  return "";
}

export function movieToForm(movie) {
  if (!movie) return emptyMovie;
  return {
    title: movie.title || "",
    description: movie.description || "",
    duration_min: movie.duration_min || 120,
    language: movie.language || "",
    genre: movie.genre || "",
    certificate: movie.certificate || "UA",
    release_date: movie.release_date || "",
    trailer_url: movie.trailer_url || "",
    status: movie.status || "now_showing",
    cast: movie.cast?.length
      ? movie.cast.map((member) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          photoUrl: member.photo || "",
          clear_photo: false,
        }))
      : [{ name: "", role: "Actor", photoUrl: "", clear_photo: false }],
  };
}

export function MovieForm({ initial, posterUrl, submitLabel, onSubmit }) {
  const [form, setForm] = useState(initial || emptyMovie);
  const [poster, setPoster] = useState(null);
  const [posterPreview, setPosterPreview] = useState("");
  const [clearPoster, setClearPoster] = useState(false);
  const [files, setFiles] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!poster) {
      setPosterPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(poster);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [poster]);

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function setCast(index, key, value) {
    setForm((current) => ({
      ...current,
      cast: current.cast.map((member, memberIndex) =>
        memberIndex === index ? { ...member, [key]: value } : member,
      ),
    }));
  }

  function choosePoster(file) {
    const problem = imageProblem(file);
    if (problem) {
      setPoster(null);
      setError(problem);
      return;
    }
    setPoster(file);
    if (file) setClearPoster(false);
    setError("");
  }

  function chooseCastPhoto(index, file) {
    const problem = imageProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setFiles((current) => ({ ...current, [index]: file || null }));
    if (file) setCast(index, "clear_photo", false);
    setError("");
  }

  function removeCast(index) {
    set("cast", form.cast.filter((_, memberIndex) => memberIndex !== index));
    setFiles((current) => {
      const next = {};
      Object.entries(current).forEach(([key, file]) => {
        const position = Number(key);
        if (position < index) next[position] = file;
        if (position > index) next[position - 1] = file;
      });
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const rows = form.cast.map((member, index) => ({ ...member, file: files[index] || null }));
    const kept = [];
    for (const row of rows) {
      const named = row.name.trim();
      if (!named && !row.file && !row.photoUrl) continue;
      if (!named) {
        setError("Add a name for every cast photo.");
        setSaving(false);
        return;
      }
      const problem = imageProblem(row.file);
      if (problem) {
        setError(problem);
        setSaving(false);
        return;
      }
      kept.push(row);
    }
    const posterProblem = imageProblem(poster);
    if (posterProblem) {
      setError(posterProblem);
      setSaving(false);
      return;
    }
    try {
      await onSubmit(
        {
          ...form,
          duration_min: Number(form.duration_min),
          trailer_url: form.trailer_url.trim(),
          cast: kept.map(({ file, photoUrl, ...member }) => ({
            id: member.id,
            name: member.name.trim(),
            role: (member.role || "").trim() || "Actor",
            clear_photo: Boolean(member.clear_photo) && !file,
          })),
        },
        {
          poster,
          clearPoster: clearPoster && !poster,
          photos: kept.map((row) => row.file),
        },
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
      <Alert>{error}</Alert>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <input className={inputClass} value={form.title} onChange={(event) => set("title", event.target.value)} required />
        </Field>
        <Field label="Status">
          <select className={inputClass} value={form.status} onChange={(event) => set("status", event.target.value)}>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <input className={inputClass} value={form.language} onChange={(event) => set("language", event.target.value)} required />
        </Field>
        <Field label="Genre">
          <input className={inputClass} value={form.genre} onChange={(event) => set("genre", event.target.value)} required />
        </Field>
        <Field label="Certificate">
          <select className={inputClass} value={form.certificate} onChange={(event) => set("certificate", event.target.value)}>
            {CERTIFICATES.map((certificate) => (
              <option key={certificate} value={certificate}>
                {certificate === "UA" ? "U/A" : certificate}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Duration (minutes)">
          <input
            className={inputClass}
            type="number"
            min="1"
            value={form.duration_min}
            onChange={(event) => set("duration_min", event.target.value)}
            required
          />
        </Field>
        <Field label="Release date">
          <input
            className={inputClass}
            type="date"
            value={form.release_date}
            onChange={(event) => set("release_date", event.target.value)}
            required
          />
        </Field>
        <Field label="Trailer URL">
          <input className={inputClass} value={form.trailer_url} onChange={(event) => set("trailer_url", event.target.value)} />
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className={inputClass}
          rows={4}
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          required
        />
      </Field>
      <Field label="Poster">
        <input
          className={inputClass}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => choosePoster(event.target.files?.[0] || null)}
        />
        <p className="mt-1 text-xs text-zinc-500">JPG, PNG, or WebP. 5 MB max. Leave empty to keep the current poster.</p>
      </Field>
      {posterPreview || (posterUrl && !clearPoster) ? (
        <img src={posterPreview || posterUrl} alt="" className="h-36 w-24 rounded-lg object-cover" />
      ) : (
        <p className="text-sm text-zinc-500">No poster yet.</p>
      )}
      {posterUrl && !poster ? (
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={clearPoster} onChange={(event) => setClearPoster(event.target.checked)} />
          Remove current poster
        </label>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-700">Cast</p>
          <button
            type="button"
            className={quietButton}
            onClick={() => {
              if (form.cast.length >= 20) {
                setError("Add at most 20 cast members.");
                return;
              }
              set("cast", [...form.cast, { name: "", role: "Actor", photoUrl: "", clear_photo: false }]);
            }}
          >
            Add person
          </button>
        </div>
        {form.cast.length === 0 ? <p className="text-sm text-zinc-500">No cast yet.</p> : null}
        {form.cast.map((member, index) => (
          <div key={member.id || `new-${index}`} className="grid gap-2 rounded-xl border border-zinc-100 p-3 md:grid-cols-[72px_1fr_160px_auto]">
            <CastPhoto member={member} file={files[index]} />
            <input
              className={inputClass}
              placeholder="Name"
              value={member.name}
              onChange={(event) => setCast(index, "name", event.target.value)}
            />
            <input
              className={inputClass}
              placeholder="Role"
              value={member.role}
              onChange={(event) => setCast(index, "role", event.target.value)}
            />
            <button type="button" className={quietButton} onClick={() => removeCast(index)}>
              Remove
            </button>
            <div className="md:col-span-4">
              <input
                className={inputClass}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseCastPhoto(index, event.target.files?.[0] || null)}
              />
              {member.photoUrl && !files[index] ? (
                <label className="mt-2 flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={Boolean(member.clear_photo)}
                    onChange={(event) => setCast(index, "clear_photo", event.target.checked)}
                  />
                  Remove photo
                </label>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <button className={buttonClass} disabled={saving} type="submit">
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

export async function saveMovie(api, path, method, form, extras = {}) {
  const payload = { ...form };
  if (!payload.trailer_url) delete payload.trailer_url;
  const photos = extras.photos || [];
  const needsFiles = Boolean(extras.poster) || photos.some(Boolean);
  if (!needsFiles && !extras.clearPoster) {
    return api(path, { method, body: payload });
  }
  const data = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === "cast") data.append("cast", JSON.stringify(value));
    else if (value !== undefined && value !== null) data.append(key, value);
  });
  if (extras.poster) data.append("poster", extras.poster);
  if (extras.clearPoster) data.append("clear_poster", "true");
  photos.forEach((file, index) => {
    if (file) data.append(`cast_photo_${index}`, file);
  });
  return api(path, { method, form: data });
}

function CastPhoto({ member, file }) {
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const src = member.clear_photo && !file ? "" : preview || member.photoUrl;
  if (!src) {
    return <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-100 text-xs text-zinc-400">Photo</div>;
  }
  return <img src={src} alt="" className="h-16 w-16 rounded-full object-cover" />;
}
