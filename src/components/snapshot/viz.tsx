// Small, glanceable visuals for the Sleep Snapshot templates.
// Server-safe (no hooks). Every value comes from core/snapshot.ts; these only draw it.

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "cn";
import { ISI_BAND_LABELS, type IsiBand } from "@/core/questionnaires";
import { formatDuration } from "@/core/time";

export const fmtMin = (v: number | null) => (v == null ? "–" : formatDuration(v));
export const fmtPct = (v: number | null) => (v == null ? "–" : `${v.toFixed(0)}%`);
export const fmtNum = (v: number | null, d = 1) => (v == null ? "–" : v.toFixed(d).replace(/\.0$/, ""));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pos = (v: number, [lo, hi]: [number, number]) => ((clamp(v, lo, hi) - lo) / (hi - lo)) * 100;

/** Did the value move in the good direction? null = no change / no data. */
export function isBetter(from: number | null, to: number | null, lowerIsBetter: boolean | null): boolean | null {
  if (from == null || to == null || lowerIsBetter == null || Math.abs(to - from) < 0.5) return null;
  return lowerIsBetter ? to < from : to > from;
}

/** "↓ 20 min · better". Direction arrow + a word, so it never relies on colour alone. */
export function DeltaChip({
  from,
  to,
  lowerIsBetter,
  fmt,
  className,
}: {
  from: number | null;
  to: number | null;
  /** null = neither direction is better (e.g. time in bed): show the change without a verdict. */
  lowerIsBetter: boolean | null;
  fmt: (v: number) => string;
  className?: string;
}) {
  const better = isBetter(from, to, lowerIsBetter);
  if (lowerIsBetter == null && from != null && to != null && Math.abs(to - from) >= 0.5) {
    const A = to < from ? ArrowDown : ArrowUp;
    return (
      <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap text-xs text-muted-foreground", className)}>
        <A className="size-3" />
        {fmt(Math.abs(to - from))}
      </span>
    );
  }
  if (better == null) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Minus className="size-3" /> no change
      </span>
    );
  }
  const Arrow = to! < from! ? ArrowDown : ArrowUp;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium",
        better ? "text-good" : "text-destructive",
        className,
      )}
    >
      <Arrow className="size-3" />
      {fmt(Math.abs(to! - from!))} · {better ? "better" : "worse"}
    </span>
  );
}

// ---- Insomnia Severity Index on its 0-28 scale with the four bands ----

const ISI_BANDS: { band: IsiBand; short: string; to: number; tone: string }[] = [
  { band: "none", short: "None", to: 7.5, tone: "bg-sev-1" },
  { band: "subthreshold", short: "Subthreshold", to: 14.5, tone: "bg-sev-2" },
  { band: "moderate", short: "Moderate", to: 21.5, tone: "bg-sev-3" },
  { band: "severe", short: "Severe", to: 28, tone: "bg-sev-4" },
];

type IsiPoint = { score: number; band: IsiBand } | null;

export function IsiScale({ baseline, now, showLabels = true }: { baseline: IsiPoint; now: IsiPoint; showLabels?: boolean }) {
  const d: [number, number] = [0, 28];
  let prev = 0;
  const close = baseline && now && Math.abs(baseline.score - now.score) < 4;
  return (
    <div className="w-full">
      <div className="relative h-3.5 text-[10px] leading-none text-muted-foreground">
        {baseline && !close && (
          <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${pos(baseline.score, d)}%` }}>
            start
          </span>
        )}
        {now && (
          <span className="absolute -translate-x-1/2 whitespace-nowrap font-medium text-foreground" style={{ left: `${pos(now.score, d)}%` }}>
            now
          </span>
        )}
      </div>
      <div className="relative py-1.5">
        <div className="flex h-2.5 gap-0.5">
          {ISI_BANDS.map((b) => {
            const w = b.to - prev;
            prev = b.to;
            return <div key={b.band} className={cn("rounded-[3px]", b.tone)} style={{ width: `${(w / 28) * 100}%` }} title={ISI_BAND_LABELS[b.band]} />;
          })}
        </div>
        {baseline && now && (
          <div
            className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-foreground/70"
            style={{ left: `${pos(Math.min(baseline.score, now.score), d)}%`, width: `${Math.abs(pos(baseline.score, d) - pos(now.score, d))}%` }}
          />
        )}
        {baseline && (
          <span
            title={`Start: ${baseline.score} (${ISI_BAND_LABELS[baseline.band]})`}
            className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card"
            style={{ left: `${pos(baseline.score, d)}%` }}
          />
        )}
        {now && (
          <span
            title={`Now: ${now.score} (${ISI_BAND_LABELS[now.band]})`}
            className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
            style={{ left: `${pos(now.score, d)}%` }}
          />
        )}
      </div>
      {showLabels && (
        <div className="flex text-[10px] leading-tight text-muted-foreground">
          {(() => {
            let p = 0;
            return ISI_BANDS.map((b) => {
              const w = b.to - p;
              p = b.to;
              return (
                <span key={b.band} style={{ width: `${(w / 28) * 100}%` }} className="truncate">
                  {b.short}
                </span>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// ---- Before -> after on one track ----

export interface DumbbellProps {
  from: number | null;
  to: number | null;
  domain: [number, number];
  lowerIsBetter: boolean | null;
  fmt: (v: number | null) => string;
  /** A reference mark, e.g. the 85% sleep-efficiency cut-off. */
  refMark?: { value: number; label: string };
  fromLabel?: string;
  toLabel?: string;
}

export function Dumbbell({ from, to, domain, lowerIsBetter, fmt, refMark, fromLabel = "First 4 weeks", toLabel = "Last 4 weeks" }: DumbbellProps) {
  const better = isBetter(from, to, lowerIsBetter);
  const a = from == null ? null : pos(from, domain);
  const b = to == null ? null : pos(to, domain);
  return (
    <div className="relative h-5 w-full">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
      {refMark && (
        <div
          className="absolute inset-y-0 border-l border-dashed border-muted-foreground/60"
          style={{ left: `${pos(refMark.value, domain)}%` }}
          title={refMark.label}
        />
      )}
      {a != null && b != null && (
        <div
          className={cn(
            "absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full",
            better == null ? "bg-muted-foreground/40" : better ? "bg-good/70" : "bg-destructive/70",
          )}
          style={{ left: `${Math.min(a, b)}%`, width: `${Math.abs(a - b)}%` }}
        />
      )}
      {a != null && (
        <span
          title={`${fromLabel}: ${fmt(from)}`}
          className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground bg-card"
          style={{ left: `${a}%` }}
        />
      )}
      {b != null && (
        <span
          title={`${toLabel}: ${fmt(to)}`}
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground ring-2 ring-card"
          style={{ left: `${b}%` }}
        />
      )}
    </div>
  );
}

export function DumbbellLegend({ from = "First 4 weeks", to = "Last 4 weeks" }: { from?: string; to?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full border-2 border-muted-foreground" /> {from}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-foreground" /> {to}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 border-l border-dashed border-muted-foreground" /> cut-off
      </span>
    </div>
  );
}

// ---- Tiny weekly trend line ----

export function Sparkline({
  values,
  domain,
  refValue,
  width = 96,
  height = 28,
  label,
}: {
  values: (number | null)[];
  domain: [number, number];
  refValue?: number;
  width?: number;
  height?: number;
  label: string;
}) {
  const pad = 3;
  const x = (i: number) => pad + (i / Math.max(1, values.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - pos(v, domain) / 100) * (height - pad * 2);
  const pts = values.map((v, i) => (v == null ? null : ([x(i), y(v)] as const)));
  const path = pts
    .map((p, i) => (p ? `${i === 0 || !pts[i - 1] ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}` : ""))
    .join("");
  const last = [...pts].reverse().find(Boolean);
  return (
    <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
      <title>{label}</title>
      {refValue != null && (
        <line x1={0} x2={width} y1={y(refValue)} y2={y(refValue)} stroke="var(--muted-foreground)" strokeOpacity={0.5} strokeDasharray="2 3" />
      )}
      <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last[0]} cy={last[1]} r={3} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={1.5} />}
    </svg>
  );
}

// ---- Part of a whole as one segmented bar ----

export function SegmentBar({
  segments,
  total,
  className,
}: {
  segments: { key: string; label: string; value: number; tone: string }[];
  total: number;
  className?: string;
}) {
  const rest = total - segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex h-3 w-full gap-0.5">
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <div key={s.key} className={cn("rounded-[3px]", s.tone)} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label}: ${s.value}`} />
          ))}
        {rest > 0 && <div className="rounded-[3px] bg-muted" style={{ width: `${(rest / total) * 100}%` }} title={`Other: ${rest}`} />}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        {segments.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-[2px]", s.tone)} />
            {s.label} <span className="font-medium text-foreground tabular-nums">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ---- Nights per week as 7 dots ----

export function WeekDots({ perWeek, tone = "bg-chart-2" }: { perWeek: number | null; tone?: string }) {
  const filled = perWeek == null ? 0 : Math.round(perWeek);
  return (
    <span className="inline-flex gap-0.5" title={perWeek == null ? "No data" : `${fmtNum(perWeek)} nights per week`}>
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={cn("size-2 rounded-full", i < filled ? tone : "bg-muted ring-1 ring-inset ring-border")} />
      ))}
    </span>
  );
}

// ---- Horizontal bar pair (e.g. watch vs diary total sleep) ----

export function BarPair({
  rows,
  max,
  fmt,
}: {
  rows: { label: string; value: number | null; tone: string }[];
  max: number;
  fmt: (v: number | null) => string;
}) {
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-xs">
          <span className="text-muted-foreground">{r.label}</span>
          <div className="h-3 rounded-r-[4px] bg-transparent">
            <div className={cn("h-full rounded-r-[4px]", r.tone)} style={{ width: `${r.value == null ? 0 : pos(r.value, [0, max])}%` }} />
          </div>
          <span className="font-medium tabular-nums">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}
