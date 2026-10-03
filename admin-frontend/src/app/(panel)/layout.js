"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { getAccess } from "@/lib/api";

export default function PanelLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getAccess()) router.replace("/login");
    else setReady(true);
  }, [router]);

  if (!ready) {
    return <p className="p-8 text-sm text-zinc-500">Checking your session…</p>;
  }
  return <Shell>{children}</Shell>;
}
