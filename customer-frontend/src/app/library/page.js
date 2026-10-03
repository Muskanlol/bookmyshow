"use client";

import { useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import { Shell } from "@/app/notifications/page";
import { getAccess, savedUser } from "@/lib/api";
import { listings } from "@/lib/catalog";
import { librarySlugs } from "@/lib/saved";
import Link from "next/link";

export default function LibraryPage() {
  const [slugs, setSlugs] = useState([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => setSlugs(librarySlugs());
    sync();
    setSignedIn(Boolean(getAccess()));
    window.addEventListener("bms-library", sync);
    return () => window.removeEventListener("bms-library", sync);
  }, []);

  const saved = listings("stream").filter((item) => slugs.includes(item.slug));
  const name = savedUser()?.name?.split(" ")[0];

  return (
    <Shell title="Stream Library">
      {!signedIn ? (
        <p className="text-sm text-[#666]">
          <Link href="/login?next=/library" className="font-semibold text-brand">Sign in</Link> to keep a library on this browser.
        </p>
      ) : (
        <p className="text-sm text-[#666]">{name ? `${name}, these` : "These"} are the stream titles you saved. This build does not charge for a rental.</p>
      )}
      {signedIn && saved.length === 0 ? <p className="text-sm text-[#777]">Open a stream title and choose Save to library.</p> : null}
      <div className="flex flex-wrap gap-4">
        {signedIn ? saved.map((item) => <ListingCard key={item.slug} item={item} layout="poster" />) : null}
      </div>
    </Shell>
  );
}
