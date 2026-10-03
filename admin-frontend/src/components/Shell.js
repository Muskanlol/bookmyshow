"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { clearSession, savedUser } from "@/lib/api";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/movies", label: "Movies" },
  { href: "/cities", label: "Cities" },
  { href: "/theatres", label: "Theatres" },
  { href: "/shows", label: "Shows" },
  { href: "/bookings", label: "Bookings" },
  { href: "/users", label: "Users" },
  { href: "/coupons", label: "Coupons" },
  { href: "/reports", label: "Reports" },
];

function NavLinks({ onNavigate }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {LINKS.map((link) => {
        const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={`block rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-brand text-white" : "text-zinc-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Shell({ children }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const user = savedUser();

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-[240px_1fr]">
      <aside className="hidden bg-ink text-white md:flex md:min-h-screen md:flex-col md:p-4">
        <div className="mb-6 px-2">
          <p className="text-lg font-semibold tracking-tight">BookMyShow</p>
          <p className="text-xs text-zinc-400">Staff console</p>
        </div>
        <NavLinks />
        <div className="mt-auto px-2 pt-6">
          <p className="truncate text-sm text-zinc-300">{user?.name || "Staff"}</p>
          <button type="button" onClick={logout} className="mt-2 text-sm text-zinc-400 hover:text-white">
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden">
          <p className="font-semibold">BookMyShow</p>
          <button type="button" onClick={() => setOpen(true)} className="text-sm">
            Menu
          </button>
        </header>
        {open ? (
          <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)}>
            <div className="h-full w-64 bg-ink p-4" onClick={(event) => event.stopPropagation()}>
              <div className="mb-4 flex items-center justify-between text-white">
                <p className="font-semibold">Menu</p>
                <button type="button" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              <NavLinks onNavigate={() => setOpen(false)} />
              <button type="button" onClick={logout} className="mt-6 text-sm text-zinc-400">
                Log out
              </button>
            </div>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
