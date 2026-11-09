// Layout B: dashboard. A row of headline numbers, one main chart, three small panels.

import { MessageCircle, Pill, ShieldAlert, Watch, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeChart } from "../se-chart";
import type { Snapshot } from "@/core/snapshot";
import { ISI_BAND_LABELS } from "@/core/questionnaires";
import { BarPair, DeltaChip, Dumbbell, DumbbellLegend, fmtMin, fmtNum, fmtPct, IsiScale, SegmentBar, Sparkline, WeekDots } from "../viz";
import { aidChanges, FlagList, METRICS, SnapshotFooter, ProviderNotes, SnapshotHeader, splitFor, WakeReasonLine } from "./parts";

function Panel({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card className="gap-3 py-4 print:break-inside-avoid print:py-2">
      <CardHeader className="print:px-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 text-muted-foreground" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="print:px-3">{children}</CardContent>
    </Card>
  );
}

export function DashboardView({ s }: { s: Snapshot }) {
  const { baseline, now } = s.isi;
  const { first, second } = s.periods;
  const tiles = [METRICS.se, METRICS.sol, METRICS.waso, METRICS.tst];
  const w = s.watch;
  const aids = aidChanges(s);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
      <SnapshotHeader s={s} />

      {/* Headline numbers: last 4 weeks, change vs first 4 weeks, weekly trend */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 print:grid-cols-5 print:gap-2">
        <Card className="col-span-2 gap-1 py-3 md:col-span-1 print:col-span-1 print:py-2">
          <CardContent className="px-4 print:px-3">
            <p className="text-xs text-muted-foreground">Insomnia Severity Index</p>
            <p className="text-2xl font-semibold leading-tight">
              {now?.score ?? "–"}
              <span className="text-sm font-normal text-muted-foreground"> / 28</span>
            </p>
            <p className="text-[11px] text-muted-foreground">was {baseline?.score ?? "–"}</p>
            <DeltaChip from={baseline?.score ?? null} to={now?.score ?? null} lowerIsBetter fmt={(v) => `${v}`} />
            <IsiScale baseline={baseline} now={now} showLabels={false} />
            <p className="text-[11px] leading-tight text-muted-foreground">{now ? ISI_BAND_LABELS[now.band] : "Not retaken"}</p>
          </CardContent>
        </Card>
        {tiles.map((m) => {
          const a = m.get(first);
          const b = m.get(second);
          return (
            <Card key={m.key} className="gap-1 py-3 print:py-2">
              <CardContent className="px-4 print:px-3">
                <p className="truncate text-xs text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-semibold leading-tight">{m.fmt(b)}</p>
                <p className="text-[11px] text-muted-foreground">was {m.fmt(a)}</p>
                <DeltaChip from={a} to={b} lowerIsBetter={m.lowerIsBetter} fmt={m.deltaFmt} />
                <div className="mt-1">
                  <Sparkline values={s.weeks.map(m.get)} domain={m.domain} refValue={m.refMark?.value} width={130} label={`${m.label}, weekly medians`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
        <Card className="gap-2 py-4 md:col-span-2 print:col-span-2 print:py-2">
          <CardHeader className="print:px-3">
            <CardTitle className="text-sm">Sleep efficiency, night by night</CardTitle>
          </CardHeader>
          <CardContent className="print:px-3">
            <SeChart data={s.series} split={splitFor(s)} className="h-56" />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-3 print:gap-2">
          <Panel title="Red flags" icon={ShieldAlert}>
            <FlagList s={s} />
          </Panel>
          {s.discuss && (
            <Panel title="Patient wants to discuss" icon={MessageCircle}>
              <p className="text-sm">“{s.discuss}”</p>
              <WakeReasonLine s={s} className="mt-2" />
              <ProviderNotes s={s} className="mt-3" />
              {s.quotes[0] && <p className="mt-2 text-xs italic text-muted-foreground">Recent note: “{s.quotes[0].text}”</p>}
            </Panel>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3 print:grid-cols-3 print:gap-2">
        <Panel title="Linked to worse nights" icon={Link2}>
          {s.links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough nights yet.</p>
          ) : (
            <div className="space-y-2.5">
              {s.links.map((l) => (
                <div key={l.habit}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{l.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {fmtPct(l.seWithout)} → {fmtPct(l.seWith)}
                    </span>
                  </div>
                  <Dumbbell
                    from={l.seWithout}
                    to={l.seWith}
                    domain={[50, 100]}
                    lowerIsBetter={false}
                    fmt={fmtPct}
                    refMark={METRICS.se.refMark}
                    fromLabel={`Without (${l.nightsWithout} nights)`}
                    toLabel={`With (${l.nightsWith} nights)`}
                  />
                </div>
              ))}
              <DumbbellLegend from="Nights without" to="Nights with" />
              <p className="text-[11px] text-muted-foreground">Sleep efficiency. Linked, not proof.</p>
            </div>
          )}
        </Panel>

        {w.nightsWithWatch > 0 && (
          <Panel title="Watch vs diary" icon={Watch}>
            <div className="space-y-3">
              <BarPair
                rows={[
                  { label: "Watch", value: w.watchTstMed, tone: "bg-chart-3" },
                  { label: "Diary", value: w.diaryTstMed, tone: "bg-chart-1" },
                ]}
                max={540}
                fmt={fmtMin}
              />
              <div>
                <p className="mb-1 text-xs text-muted-foreground">
                  Off by 1 h+ on <span className="font-medium text-foreground">{w.mismatched} of {w.nightsWithWatch}</span> nights. Patient says:
                </p>
                <SegmentBar
                  total={w.mismatched}
                  segments={[
                    { key: "lying", label: "Lying awake, still", value: w.answers.lying_awake, tone: "bg-chart-1" },
                    { key: "off", label: "Watch off", value: w.answers.took_off, tone: "bg-chart-2" },
                    { key: "unsure", label: "Not sure", value: w.answers.not_sure, tone: "bg-chart-3" },
                  ]}
                />
              </div>
            </div>
          </Panel>
        )}

        <Panel title="Sleep aids, nights / week" icon={Pill}>
          {aids.length === 0 ? (
            <p className="text-sm text-muted-foreground">None reported.</p>
          ) : (
            <div className="space-y-2.5">
              {aids.map((a) => (
                <div key={a.key} className="space-y-1">
                  <p className="text-sm font-medium">{a.label}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums">
                    <WeekDots perWeek={a.from} />
                    <span className="text-muted-foreground">{fmtNum(a.from)}</span>
                    <span className="text-muted-foreground">→</span>
                    <WeekDots perWeek={a.to} />
                    <span className="font-medium">{fmtNum(a.to)}</span>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-muted-foreground">First 4 weeks → last 4 weeks</p>
            </div>
          )}
        </Panel>
      </div>

      <SnapshotFooter s={s} />
    </div>
  );
}
