import Link from "next/link";
import { Shell } from "@/app/notifications/page";

export default function BookAChangePage() {
  return (
    <Shell title="BookAChange">
      <p className="text-sm leading-6 text-[#555]">
        Changed your plan? Cancel the ticket from Your Orders, then book another show. Confirmed seats are released when the booking is cancelled.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link href="/bookings" className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white">Your orders</Link>
        <Link href="/movies" className="rounded bg-white px-4 py-2 text-sm font-semibold text-[#222] shadow-sm">Browse movies</Link>
      </div>
    </Shell>
  );
}
