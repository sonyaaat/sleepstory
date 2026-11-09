// Layout A: a 30-second brief. Three questions a provider asks, each answered with one visual.

import { Pill, Quote, Watch } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Snapshot } from "@/core/snapshot";
import { ISI_BAND_LABELS } from "@/core/questionnaires";
import { DeltaChip, fmtMin, fmtNum, IsiScale, Sparkline } from "../viz";
import { aidChanges, FlagList, METRICS, SnapshotFooter, ProviderNotes, SnapshotHeader, WakeReasonLine } from "./parts";

function Row({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <Card className="gap-0 py-4 print:break-inside-avoid print:py-2">
      <CardContent className="grid gap-3 sm:grid-cols-[9rem_1fr] sm:gap-6 print:grid-cols-[8rem_1fr] print:px-3">
        <h2 className="text-sm font-semibold leading-snug text-muted-foreground">{q}</h2>
        <div className="min-w-0">{children}</div>
      </CardContent>
    </Card>
  );
}

export function BriefView({ s }: { s: Snapshot }) {
  const { baseline, now } = s.isi;
  const { first, second } = s.periods;
  const tiles = [METRICS.se, METRICS.sol, METRICS.waso, METRICS.tst];
  const aids = aidChanges(s).filter((a) => Math.abs(a.to - a.from) >= 1);
  const w = s.watch;
  const topReason = w.mismatched > 0 && w.answers.lying_awake >= w.mismatched / 2;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <SnapshotHeader s={s} />

      <Row q="Is sleep getting better?">
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm">
                <span className="font-medium">Insomnia Severity Index</span>{" "}
                <span className="text-2xl font-semibold tabular-nums">
                  {baseline?.score ?? "–"} → {now?.score ?? "–"}
                </span>
                <span className="text-muted-foreground"> / 28</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {baseline ? ISI_BAND_LABELS[baseline.band] : "No baseline"} → {now ? ISI_BAND_LABELS[now.band] : "not retaken"}
              </p>
            </div>
            <IsiScale baseline={baseline} now={now} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {tiles.map((m) => {
              const a = m.get(first);
              const b = m.get(second);
              return (
                <div key={m.key} className="rounded-lg bg-muted/60 p-2.5">
                  <p className="truncate text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-semibold leading-tight">{m.fmt(b)}</p>
                  <p className="text-[11px] text-muted-foreground">was {m.fmt(a)}</p>
                  <DeltaChip from={a} to={b} lowerIsBetter={m.lowerIsBetter} fmt={m.deltaFmt} />
                  <div className="mt-1">
                    <Sparkline
                      values={s.weeks.map(m.get)}
                      domain={m.domain}
                      refValue={m.refMark?.value}
                      width={110}
                      label={`${m.label}, weekly medians over 8 weeks`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Big number = median of the last 4 weeks · line = weekly medians over 8 weeks · dashed = cut-off
          </p>
        </div>
      </Row>

      <Row q="Anything to act on?">
        <div className="space-y-2">
          <FlagList s={s} compact />
          {aids.map((a) => (
            <p key={a.key} className="flex items-center gap-2 text-sm">
              <Pill className="size-4 text-chart-2" />
              <span>
                <span className="font-medium">{a.label}</span> {fmtNum(a.from)} → {fmtNum(a.to)} nights / week
              </span>
            </p>
          ))}
        </div>
      </Row>

      <Row q="What to talk about">
        <div className="space-y-3">
          {s.discuss && (
            <blockquote className="border-l-4 border-brand pl-3 text-base">
              “{s.discuss}”<span className="block text-xs text-muted-foreground">Patient wants to discuss</span>
            </blockquote>
          )}
          <ProviderNotes s={s} />
          {s.links.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="text-xs text-muted-foreground">Worse nights after:</span>
              {s.links.map((l) => (
                <span key={l.habit} className="rounded-full bg-secondary px-2.5 py-0.5" title={`${l.nightsWith} nights with vs ${l.nightsWithout} without`}>
                  {l.label} <span className="text-xs text-muted-foreground">−{l.seDrop.toFixed(0)} pts</span>
                </span>
              ))}
            </div>
          )}
          <WakeReasonLine s={s} />
          {w.nightsWithWatch > 0 && w.mismatched > 0 && (
            <p className="flex items-start gap-2 text-sm">
              <Watch className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                Watch shows {fmtMin(w.watchTstMed)} sleep vs {fmtMin(w.diaryTstMed)} in the diary; off by 1 h+ on {w.mismatched} of{" "}
                {w.nightsWithWatch} nights{topReason && ", mostly “lying awake but still”"}.
              </span>
            </p>
          )}
          {s.quotes[0] && (
            <p className="flex items-start gap-2 text-sm italic text-muted-foreground">
              <Quote className="mt-0.5 size-4 shrink-0" />“{s.quotes[0].text}”
            </p>
          )}
        </div>
      </Row>

      <SnapshotFooter s={s} />
    </div>
  );
}
