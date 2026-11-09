"use client";

import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { SLEEP_AIDS } from "@/core/schema";
import { formatDate } from "@/core/time";

type Point = { date: string; se: number; avg7: number; sleepAid: string | null };

const AID_LABEL = Object.fromEntries(SLEEP_AIDS.map((a) => [a.key, a.label]));

/** Nightly sleep efficiency, 7-night average, and sleep-aid nights (PRV-05). One axis, percent. */
export function SeChart({ data }: { data: Point[] }) {
  const rows = data.map((d) => ({ ...d, aid: d.sleepAid ? 101 : null }));
  return (
    <figure className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-chart-1" /> 7-night average
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground/40" /> Each night
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rotate-45 bg-chart-2" /> Sleep aid taken
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-muted-foreground" /> 85% (poor night below)
        </span>
      </div>
      <div className="h-48 w-full print:h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
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
              domain={[40, 104]}
              ticks={[50, 60, 70, 80, 90, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <ReferenceLine y={85} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
            <Scatter dataKey="se" fill="var(--muted-foreground)" fillOpacity={0.4} isAnimationActive={false} />
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
