"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AccountMenu from "@/components/AccountMenu";
import { api, savedCity, savedUser, saveCity } from "@/lib/api";

const PRIMARY = [
  { label: "Movies", href: "/movies" },
  { label: "Stream", href: "/explore/stream" },
  { label: "Events", href: "/explore/events" },
  { label: "Plays", href: "/explore/plays" },
  { label: "Sports", href: "/explore/sports" },
  { label: "Activities", href: "/explore/activities" },
];

const SECONDARY = [
  { label: "Offers", href: "/offers" },
  { label: "Gift Cards", href: "/explore/gift-cards" },
];

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [city, setCity] = useState(null);
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const sync = () => {
      setUser(savedUser());
      setCity(savedCity());
    };
    sync();
    window.addEventListener("bms-auth", sync);
    window.addEventListener("bms-city", sync);
    return () => {
      window.removeEventListener("bms-auth", sync);
      window.removeEventListener("bms-city", sync);
    };
  }, []);

  useEffect(() => {
    api("/api/v1/cities/")
      .then((rows) => {
        setCities(rows);
        if (!savedCity() && rows.length) {
          saveCity(rows.find((item) => item.name === "Mumbai") || rows[0]);
        }
      })
      .catch(() => {});
  }, []);

  function search(event) {
    event.preventDefault();
    const term = query.trim();
    router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/movies");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#eee] bg-white text-[#222] shadow-sm">
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-5 py-3">
        <Link href="/" className="shrink-0 text-[22px] font-semibold tracking-tight text-[#222]">
          book<span className="text-brand">my</span>show
        </Link>
        <form onSubmit={search} className="hidden min-w-0 flex-1 md:block">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for Movies, Events, Plays, Sports and Activities"
            className="w-full rounded border border-[#e8e8e8] bg-[#f5f5f5] px-3 py-2 text-sm text-[#333] outline-none placeholder:text-[#9a9a9a]"
          />
        </form>
        <button type="button" onClick={() => setOpen(true)} className="ml-auto text-sm text-[#333] md:ml-0">
          {city?.name || "Select your region"} <span className="text-[10px] text-[#888]">▼</span>
        </button>
        {user ? (
          <span className="text-sm font-medium text-[#333]">Hi, {user.name.split(" ")[0]}</span>
        ) : (
          <Link href="/login" className="rounded bg-brand px-3.5 py-1.5 text-xs font-semibold text-white">
            Sign in
          </Link>
        )}
        <button type="button" className="text-xl leading-none text-[#333]" onClick={() => setMenu(true)} aria-label="Account menu">
          ☰
        </button>
      </div>
      <form onSubmit={search} className="px-5 pb-3 md:hidden">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for Movies, Events, Plays, Sports and Activities"
          className="w-full rounded border border-[#e8e8e8] bg-[#f5f5f5] px-3 py-2 text-sm text-[#333] outline-none"
        />
      </form>
      <div className="hidden border-t border-[#f0f0f0] md:block">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-2.5 text-sm text-[#333]">
          <div className="flex gap-5">
            {PRIMARY.map((item) => (
              <Link key={item.label} href={item.href} className="hover:text-brand">{item.label}</Link>
            ))}
          </div>
          <div className="flex gap-5 text-[#555]">
            {SECONDARY.map((item) => (
              <Link key={item.label} href={item.href} className="hover:text-brand">{item.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {menu ? <AccountMenu user={user} onClose={() => setMenu(false)} /> : null}

      {open ? (
        <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)}>
          <div className="mx-auto mt-20 w-[min(720px,94vw)] rounded-lg bg-white p-5 text-[#222] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-center text-sm text-[#777]">Popular Cities</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {cities.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    saveCity(item);
                    setOpen(false);
                  }}
                  className={`rounded-lg border px-3 py-4 text-center ${city?.id === item.id ? "border-brand text-brand" : "border-transparent hover:bg-zinc-50"}`}
                >
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-[#888]">{item.state}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
