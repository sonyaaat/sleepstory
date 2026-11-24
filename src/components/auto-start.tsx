"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { startAsMaya } from "@/app/actions";
import { MoonMark } from "@/components/brand";

/**
 * Sends a returning tester to Maya's morning, or starts a Maya session for a new one
 * (setting the cookie needs a server action, not a page render).
 */
export function AutoStart({ hasSession }: { hasSession: boolean }) {
  const router = useRouter();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // React runs effects twice in development; the session is created once
    started.current = true;
    if (hasSession) router.replace("/patient");
    else void startAsMaya();
  }, [hasSession, router]);
  return (
    <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <MoonMark className="size-16 animate-pulse" />
    </main>
  );
}
