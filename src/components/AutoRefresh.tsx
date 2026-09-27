"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Keeps server-rendered counselor pages live during the demo; a real deployment would push updates instead.
export default function AutoRefresh({ ms = 3000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
