"use client";

import { cn } from "cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HABITS, SLEEP_AIDS } from "@/core/schema";
import type { SnapshotDay } from "@/core/snapshot";
import { formatDate, formatDuration } from "@/core/time";

const AID = Object.fromEntries(SLEEP_AIDS.map((a) => [a.key, a.label]));
const AID_GLYPH: Record<string, string> = { melatonin: "M", otc: "O", prescription: "Rx" };
const HABIT = Object.fromEntries(HABITS.map((h) => [h.key, h.short]));

/** Sleep-efficiency bins: lighter = better night. Same ramp as the ISI scale. */
export const SE_BINS = [
  { min: 85, label: "85%+", tone: "bg-sev-1", ink: "text-foreground" },
  { min: 75, label: "75–84%", tone: "bg-sev-2", ink: "text-white" },
  { min: 65, label: "65–74%", tone: "bg-sev-3", ink: "text-background" },
  { min: -1, label: "under 65%", tone: "bg-sev-4", ink: "text-background" },
] as const;

const bin = (se: number) => SE_BINS.find((b) => se >= b.min)!;

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * One square per night, one row per week, so a provider sees the pattern (and missing nights)
 * at a glance. Rows start on the first night of the period, not on Monday.
 */
export function NightCalendar({
  days,
  weekMedians,
  size = "md",
}: {
  days: SnapshotDay[];
  weekMedians?: (number | null)[];
  size?: "sm" | "md";
}) {
  const weeks = Array.from({ length: Math.ceil(days.length / 7) }, (_, i) => days.slice(i * 7, i * 7 + 7));
  const cell = size === "sm" ? "h-5" : "h-7";
  const firstDow = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const heads = Array.from({ length: 7 }, (_, i) => WEEKDAYS[(firstDow + i) % 7]);
  return (
    <TooltipProvider>
      <div className="space-y-1">
        <div className="grid grid-cols-[3rem_repeat(7,1fr)_2.5rem] gap-0.5 text-[10px] text-muted-foreground">
          <span />
          {heads.map((d, i) => (
            <span key={i} className="text-center">
              {d}
            </span>
          ))}
          <span className="text-right">{weekMedians ? "median" : ""}</span>
        </div>
        {weeks.map((w, wi) => (
          <div key={w[0].date} className="grid grid-cols-[3rem_repeat(7,1fr)_2.5rem] items-center gap-0.5">
            <span className="text-[10px] text-muted-foreground tabular-nums">{formatDate(w[0].date)}</span>
            {w.map((d) => {
              const b = d.se == null ? null : bin(d.se);
              return (
                <Tooltip key={d.date}>
                  <TooltipTrigger asChild>
                    <div
                      tabIndex={0}
                      aria-label={`${formatDate(d.date)}: ${!d.logged ? "not logged" : d.se == null ? "logged, some answers unknown" : `${d.se.toFixed(0)}% sleep efficiency`}`}
                      className={cn(
                        "flex items-center justify-center rounded-[4px] text-[9px] font-semibold leading-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        cell,
                        b ? [b.tone, b.ink] : d.logged ? "bg-muted ring-1 ring-border" : "border border-dashed border-muted-foreground/50",
                        wi === 4 && "mt-1.5",
                      )}
                    >
                      {d.sleepAid && AID_GLYPH[d.sleepAid]}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{formatDate(d.date)}</p>
                    {d.logged ? (
                      <>
                        <p>
                          {d.se == null
                            ? "Sleep efficiency unknown (some answers were “I don’t know”)"
                            : `Sleep efficiency ${d.se.toFixed(0)}% · slept ${formatDuration(d.tst)}`}
                        </p>
                        {d.sleepAid && <p>Sleep aid: {AID[d.sleepAid]}</p>}
                        {d.habits.length > 0 && <p>{d.habits.map((h) => HABIT[h]).join(", ")}</p>}
                      </>
                    ) : (
                      <p>Not logged</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            <span className={cn("text-right text-xs font-medium tabular-nums", wi === 4 && "mt-1.5")}>
              {weekMedians && weekMedians[wi] != null ? `${weekMedians[wi]!.toFixed(0)}%` : ""}
            </span>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function NightCalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span>Sleep efficiency:</span>
      {SE_BINS.map((b) => (
        <span key={b.label} className="flex items-center gap-1">
          <span className={cn("size-3 rounded-[3px]", b.tone)} /> {b.label}
        </span>
      ))}
      <span className="flex items-center gap-1">
        <span className="size-3 rounded-[3px] border border-dashed border-muted-foreground/60" /> not logged
      </span>
      <span>M melatonin · Rx prescription · O over-the-counter</span>
    </div>
  );
}
