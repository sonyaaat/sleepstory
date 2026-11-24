"use client";

import { useEffect, useRef } from "react";
import { startAsMaya } from "@/app/actions";
import { MoonMark } from "@/components/brand";

/** Starts a Maya session for a new visitor (setting the cookie needs a server action, not a page render). */
export function AutoStart() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // React runs effects twice in development
    started.current = true;
    void startAsMaya();
  }, []);
  return (
    <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
      <MoonMark className="size-16 animate-pulse" />
    </main>
  );
}
