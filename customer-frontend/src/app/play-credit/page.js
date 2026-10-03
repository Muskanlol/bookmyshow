"use client";

import Link from "next/link";
import { Shell } from "@/app/notifications/page";
import { savedUser } from "@/lib/api";

export default function PlayCreditPage() {
  const name = savedUser()?.name || "Guest";
  return (
    <Shell title="Play Credit Card">
      <p className="text-sm text-[#666]">This is an in-app benefits card. It is not a bank card, and no payment details are stored.</p>
      <div className="rounded-2xl bg-gradient-to-br from-[#1c1c28] to-[#3a2a4a] p-6 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-white/60">BookMyShow</p>
        <p className="mt-6 text-2xl font-semibold">Play Credit</p>
        <p className="mt-1 text-sm text-white/70">{name}</p>
        <p className="mt-8 text-sm">Benefits you can use at movie checkout</p>
      </div>
      <article className="rounded-lg bg-white px-4 py-4 shadow-sm">
        <p className="font-semibold">SAVE50</p>
        <p className="mt-1 text-sm text-[#666]">Flat ₹50 off the ticket total. The convenience fee stays ₹20.</p>
      </article>
      <article className="rounded-lg bg-white px-4 py-4 shadow-sm">
        <p className="font-semibold">TAKE10</p>
        <p className="mt-1 text-sm text-[#666]">10% off the ticket total, capped at that total. Apply it on the checkout page before you pay.</p>
      </article>
      <Link href="/offers" className="inline-flex text-sm font-semibold text-brand">See all offers ›</Link>
    </Shell>
  );
}
