// Shared visual pieces for the SleepStory look (reference design in docs/design/inspiration).

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

/** "5 of your last 7 mornings" with one dot per morning (CHK-01, CHK-08). Never a score. */
export function WeekDots({
  week,
}: {
  week: { morning: string; label: string; logged: boolean; isToday: boolean }[];
}) {
  const logged = week.filter((d) => d.logged).length;
  return (
    <div className="rounded-3xl bg-card p-5 text-card-foreground ring-1 ring-border/60">
      <p className="font-semibold">
        {logged} of your last {week.length} mornings
      </p>
      <ol className="mt-4 grid grid-cols-7 gap-1" aria-label="Mornings with a check-in this week">
        {week.map((d) => (
          <li key={d.morning} className="flex flex-col items-center gap-1.5">
            <span
              className={cn(
                "size-9 rounded-full border-2",
                d.logged ? "border-brand bg-brand" : "border-border bg-transparent",
                d.isToday && "ring-2 ring-brand ring-offset-2 ring-offset-card",
              )}
              aria-label={`${d.label}: ${d.logged ? "logged" : "not logged"}`}
            />
            <span className={cn("text-xs text-muted-foreground", d.isToday && "font-bold text-foreground")}>
              {d.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A soft card used across the patient screens. */
export function SoftCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl bg-card p-5 text-card-foreground ring-1 ring-border/60", className)}>{children}</div>;
}
