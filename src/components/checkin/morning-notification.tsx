"use client";

// A mock phone notification for the demo (CHK-18). A real app would send a push notification
// or show a home-screen widget at the patient's reminder time; a web prototype can't.

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { MoonMark } from "@/components/brand";
import { cn } from "@/lib/utils";

export function MorningNotification({ firstName, time, streakDays }: { firstName: string; time: string; streakDays: number }) {
  const [shown, setShown] = useState(false);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 600);
    return () => clearTimeout(t);
  }, []);
  if (closed) return null;
  return (
    <div
      className={cn(
        "fixed inset-x-0 top-14 z-40 mx-auto w-[calc(100%-24px)] max-w-sm transition-all duration-500",
        shown ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
      )}
      role="status"
    >
      <div className="relative rounded-3xl bg-card/95 p-3.5 pr-10 shadow-xl ring-1 ring-border backdrop-blur">
        <Link href="/patient/checkin?mode=voice" className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-deep">
            <MoonMark className="size-6" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="font-semibold tracking-wide uppercase">SleepStory</span>
              <span>{time}</span>
            </span>
            <span className="mt-0.5 block font-semibold">Good morning, {firstName}</span>
            <span className="block text-sm text-muted-foreground">
              How did you sleep? Tap to check in{streakDays > 0 ? ` and keep your ${streakDays}-day streak` : ""}.
            </span>
          </span>
        </Link>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => setClosed(true)}
          className="absolute top-2.5 right-2.5 flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-2"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Demo of the morning reminder</p>
    </div>
  );
}
