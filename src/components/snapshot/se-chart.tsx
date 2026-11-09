"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "cn";
import { SLEEP_AIDS } from "@/core/schema";
import { formatDate } from "@/core/time";

type Point = { date: string; se: number; avg7: number; sleepAid: string | null };

const AID_LABEL = Object.fromEntries(SLEEP_AIDS.map((a) => [a.key, a.label]));

/**
 * Nightly sleep efficiency, 7-night average, and sleep-aid nights (PRV-05). One axis, percent.
 * `split` shades the last 4 weeks so the before/after comparison is visible on the chart itself.
 */
export function SeChart({
  data,
  split,
  className = "h-48",
  showLegend = true,
}: {
  data: Point[];
  split?: { date: string; firstMed: number | null; secondMed: number | null };
  className?: string;
  showLegend?: boolean;
}) {
  const rows = data.map((d) => ({ ...d, aid: d.sleepAid ? 101 : null }));
  const last = rows.at(-1)?.date;
  const first = rows[0]?.date;
  return (
    <figure className="space-y-2">
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-chart-1" /> 7-night average
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/50" /> Each night
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rotate-45 bg-chart-2" /> Sleep aid
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0 w-4 border-t border-dashed border-muted-foreground" /> 85% cut-off
          </span>
        </div>
      )}
      <div className={cn("w-full print:h-36", className)}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 14, right: 8, bottom: 0, left: -16 }}>
            {split && last && (
              <ReferenceArea
                x1={split.date}
                x2={last}
                fill="var(--muted)"
                fillOpacity={0.9}
                ifOverflow="extendDomain"
                label={{ value: "Last 4 weeks", position: "insideTopLeft", fontSize: 10, fill: "var(--muted-foreground)" }}
              />
            )}
            {split && first && (
              <ReferenceArea
                x1={first}
                x2={split.date}
                fillOpacity={0}
                label={{ value: "First 4 weeks", position: "insideTopLeft", fontSize: 10, fill: "var(--muted-foreground)" }}
              />
            )}
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={40}
            />
            <YAxis
              domain={split ? [40, 112] : [40, 104]}
              ticks={[50, 60, 70, 80, 90, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={85} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            {split?.firstMed != null && first && (
              <ReferenceLine
                segment={[
                  { x: first, y: split.firstMed },
                  { x: split.date, y: split.firstMed },
                ]}
                stroke="var(--foreground)"
                strokeOpacity={0.5}
                strokeWidth={1.5}
                label={{ value: `median ${split.firstMed.toFixed(0)}%`, position: "insideBottomLeft", fontSize: 10, fill: "var(--foreground)" }}
              />
            )}
            {split?.secondMed != null && last && (
              <ReferenceLine
                segment={[
                  { x: split.date, y: split.secondMed },
                  { x: last, y: split.secondMed },
                ]}
                stroke="var(--foreground)"
                strokeOpacity={0.5}
                strokeWidth={1.5}
                label={{ value: `median ${split.secondMed.toFixed(0)}%`, position: "insideBottomRight", fontSize: 10, fill: "var(--foreground)" }}
              />
            )}
            <Scatter dataKey="se" fill="var(--muted-foreground)" fillOpacity={0.45} isAnimationActive={false} />
            <Line type="monotone" dataKey="avg7" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Scatter dataKey="aid" fill="var(--chart-2)" shape="diamond" isAnimationActive={false} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                return (
                  <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-sm">
                    <p className="font-medium">{formatDate(p.date)}</p>
                    <p>Sleep efficiency: {p.se.toFixed(0)}%</p>
                    <p className="text-muted-foreground">7-night average: {p.avg7.toFixed(0)}%</p>
                    {p.sleepAid && <p>Sleep aid: {AID_LABEL[p.sleepAid]}</p>}
                  </div>
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Nightly sleep efficiency over the period, with a 7-night average line and markers on nights a sleep aid was taken.
      </figcaption>
    </figure>
  );
}
