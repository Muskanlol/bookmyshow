"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/api";

const ROWS = [
  { href: "/notifications", title: "Notifications", note: "", icon: "bell" },
  { href: "/bookings", title: "Your Orders", note: "View all your bookings & purchases", icon: "bag", lock: true },
  { href: "/wishlist", title: "Your Wishlist", note: "", icon: "heart" },
  { href: "/library", title: "Stream Library", note: "Saved titles to watch", icon: "screen", lock: true },
  { href: "/play-credit", title: "Play Credit Card", note: "View your Play Credit Card details and offers", icon: "card", badge: "NEW" },
  { href: "/help", title: "Help & Support", note: "View commonly asked queries", icon: "chat" },
  { href: "/settings", title: "Accounts & Settings", note: "Location, sign-in, and more", icon: "gear", lock: true },
  { href: "/rewards", title: "Rewards", note: "View your rewards & unlock new ones", icon: "gift" },
  { href: "/book-a-change", title: "BookAChange", note: "Cancel a ticket and book another show", icon: "globe" },
];

export default function AccountMenu({ user, onClose }) {
  const router = useRouter();
  const first = user?.name?.split(" ")[0];

  function open(row) {
    onClose();
    if (row.lock && !user) {
      router.push(`/login?next=${encodeURIComponent(row.href)}`);
      return;
    }
    router.push(row.href);
  }

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute right-0 top-[108px] h-[min(640px,calc(100vh-120px))] w-[min(380px,100vw)] overflow-y-auto bg-white text-[#222] shadow-2xl md:right-4 md:rounded-b-xl" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-[#eee] px-5 py-4">
          <p className="text-2xl font-semibold">{first ? `Hey, ${first}!` : "Hey!"}</p>
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-[#f7f7f7] px-3 py-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2b2b3a] text-lg">🎁</span>
            <p className="min-w-0 flex-1 text-sm font-medium leading-5">Unlock special offers & great benefits</p>
            {user ? (
              <span className="text-xs font-semibold text-[#1f8a3b]">Unlocked</span>
            ) : (
              <Link href="/login" onClick={onClose} className="shrink-0 rounded-full border border-brand px-3 py-1.5 text-xs font-semibold text-brand">
                Login / Register
              </Link>
            )}
          </div>
        </div>
        <div>
          {ROWS.map((row) => (
            <button key={row.href} type="button" onClick={() => open(row)} className="flex w-full items-center gap-3 border-b border-[#f2f2f2] px-5 py-3.5 text-left hover:bg-[#fafafa]">
              <Icon name={row.icon} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {row.title}
                  {row.badge ? <span className="rounded bg-[#f5c518] px-1 text-[10px] font-bold text-[#222]">{row.badge}</span> : null}
                </span>
                {row.note ? <span className="mt-0.5 block text-xs text-[#888]">{row.note}</span> : null}
              </span>
              {row.lock && !user ? <Lock /> : <Chevron />}
            </button>
          ))}
        </div>
        {user ? (
          <button
            type="button"
            className="w-full px-5 py-4 text-left text-sm font-semibold text-brand"
            onClick={() => {
              clearSession();
              onClose();
              router.push("/");
            }}
          >
            Sign out
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Chevron() {
  return <span className="text-[#bbb]">›</span>;
}

function Lock() {
  return <span className="text-xs text-[#bbb]" aria-label="Sign in required">🔒</span>;
}

function Icon({ name }) {
  const common = "h-5 w-5 shrink-0 text-[#444]";
  if (name === "heart") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 19s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z" /></svg>;
  }
  if (name === "bag") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>;
  }
  if (name === "bell") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 16V10a6 6 0 1 1 12 0v6l1.5 2h-15L6 16Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>;
  }
  if (name === "screen") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 20h8" /></svg>;
  }
  if (name === "card") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></svg>;
  }
  if (name === "chat") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 16.5 3.5 20 8 18.2A8 8 0 1 0 5 16.5Z" /></svg>;
  }
  if (name === "gear") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" /></svg>;
  }
  if (name === "gift") {
    return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="10" width="16" height="9" rx="1" /><path d="M4 10h16V8H4v2Zm8 0v9M12 8c-2 0-3-2.5-1.5-3.5S12 6 12 8Zm0 0c2 0 3-2.5 1.5-3.5S12 6 12 8Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.5 2.5 2.5 13 0 16M12 4c-2.5 2.5-2.5 13 0 16" /></svg>;
}
