"use client";

import { useState } from "react";
import { Shell } from "@/app/notifications/page";

const QUESTIONS = [
  ["How do I book?", "Open a movie, choose Book tickets, pick a showtime and seats, then pay on checkout."],
  ["How long are seats held?", "A hold lasts 8 minutes. If it expires, the seats go back on sale."],
  ["Which coupons work?", "SAVE50 is ₹50 off the ticket total. TAKE10 is 10% off. Apply the code before you pay. Partner offers on the Offers page are not applied in checkout."],
  ["Can I cancel?", "Open the ticket from Your Orders and cancel a confirmed booking. A pending booking can be cancelled from checkout."],
  ["Why does a movie have no showtimes?", "Only films with a scheduled screen in your city can be booked. Switch city from the header if you need another city's shows."],
];

export default function HelpPage() {
  const [sent, setSent] = useState(false);
  return (
    <Shell title="Help & Support">
      {QUESTIONS.map(([question, answer]) => (
        <article key={question} className="rounded-lg bg-white px-4 py-4 shadow-sm">
          <p className="font-semibold text-[#222]">{question}</p>
          <p className="mt-1 text-sm leading-6 text-[#666]">{answer}</p>
        </article>
      ))}
      <form
        className="rounded-lg bg-white px-4 py-4 shadow-sm"
        onSubmit={(event) => {
          event.preventDefault();
          setSent(true);
        }}
      >
        <p className="font-semibold">Ask a question</p>
        <textarea required rows={3} className="mt-2 w-full rounded border border-[#e5e5e5] px-3 py-2 text-sm outline-none" placeholder="What do you need help with?" />
        <button type="submit" className="mt-3 rounded bg-brand px-4 py-2 text-sm font-semibold text-white">Send</button>
        {sent ? <p className="mt-2 text-sm text-[#666]">Saved on this page only. This demo does not send the message to a support desk.</p> : null}
      </form>
    </Shell>
  );
}
