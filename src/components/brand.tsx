// Shared visual pieces for the SleepStory look (reference design in docs/design/inspiration).

import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export function MoonMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-6", className)}>
      <path d="M15 3a9 9 0 1 0 6 15a7.5 7.5 0 1 1 -6 -15z" fill="var(--brand)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <MoonMark className="size-[22px]" />
      <span className="font-display text-lg">SleepStory</span>
    </span>
  );
}

/** Mobile-first page frame for the patient side. */
export function PatientShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto flex min-h-[calc(100dvh-49px)] w-full max-w-md flex-col px-6 pt-8 pb-10", className)}>
      {children}
    </main>
  );
}

/**
 * Streak header plus one circle per morning (CHK-01, CHK-08). Logged mornings show a flame,
 * missed ones stay empty, and today waits for a check-in. Never a score.
 */
export function WeekDots({
  week,
  streak,
}: {
  week: { morning: string; label: string; logged: boolean; isToday: boolean }[];
  streak: number;
}) {
  const logged = week.filter((d) => d.logged).length;
  const todayDone = week.at(-1)?.logged ?? false;
  return (
    <div className="rounded-3xl bg-card p-5 text-card-foreground ring-1 ring-border/60">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-lg font-semibold">
          <Flame className="size-5 fill-brand text-brand" aria-hidden="true" />
          {streak}-day streak
        </p>
        <p className="text-sm text-muted-foreground">
          {logged} of {week.length} mornings
        </p>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Mornings with a check-in this week">
        {week.map((d) => {
          const missed = !d.logged && !d.isToday;
          const status = d.logged ? "checked in" : d.isToday ? "not yet, check in today" : "missed";
          return (
            <li key={d.morning} className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2",
                  d.logged && "border-brand bg-brand text-brand-foreground",
                  missed && "border-dashed border-muted-foreground/40",
                  d.isToday && !d.logged && "animate-pulse border-dashed border-brand",
                )}
                aria-label={`${d.label}: ${status}`}
              >
                {d.logged && <Flame className="size-[18px]" strokeWidth={2.4} aria-hidden="true" />}
              </span>
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  missed && "text-muted-foreground/60",
                  d.isToday && "font-bold text-foreground",
                )}
              >
                {d.isToday ? "Today" : d.label}
              </span>
            </li>
          );
        })}
      </ol>
      {!todayDone && <p className="mt-4 text-sm font-medium">Check in today to keep your streak going.</p>}
    </div>
  );
}

/** A soft card used across the patient screens. */
export function SoftCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl bg-card p-5 text-card-foreground ring-1 ring-border/60", className)}>
      {children}
    </div>
  );
}
