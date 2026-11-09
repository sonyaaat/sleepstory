"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AlertTriangle, Check, Loader2, Lock, Pill, Plus, Sparkles, Watch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MoonMark, PatientShell, SoftCard } from "@/components/brand";
import { saveOnboarding } from "@/app/actions";
import { MEDICINE_SAFETY_LINE, planText, type Medication } from "@/core/medications";
import { ALCOHOL_OPTIONS, CAFFEINE_OPTIONS, EXERCISE_OPTIONS, type OnboardingInput } from "@/core/onboarding";
import {
  ISI_ITEMS,
  ISI_SCALES,
  PHQ2_ITEMS,
  PHQ2_OPTIONS,
  SCREENING_QUESTIONS,
  type IsiAnswers,
  type Screening,
} from "@/core/questionnaires";
import type { SleepAid } from "@/core/schema";
import { formatDateLong } from "@/core/time";
import { cn } from "@/lib/utils";

export type OnboardingInitial = Omit<OnboardingInput, "consent" | "changed" | "durationMs">;

const STEPS = ["Welcome", "Your care", "Your usual day", "Sleep medicines", "Sleep check", "Safety"] as const;
const CHIP = "h-11 rounded-full! border-2! px-4 text-[15px] font-semibold";
const KIND_LABEL: Record<SleepAid, string> = { melatonin: "Melatonin", otc: "Over-the-counter", prescription: "Prescription" };

export function OnboardingFlow({ initial, providerName, firstName }: { initial: OnboardingInitial; providerName: string; firstName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0..5 = screens, 6 = done
  const [consent, setConsent] = useState(false);
  const [care, setCare] = useState({ visitDate: initial.visitDate, reminderTime: initial.reminderTime, watchConnected: initial.watchConnected });
  const [usual, setUsual] = useState(initial.usual);
  const [meds, setMeds] = useState<Medication[]>(initial.medications);
  const [isi, setIsi] = useState<IsiAnswers>(initial.isi);
  const [screening, setScreening] = useState<Screening>(initial.screening);
  const [saving, startSaving] = useTransition();
  const startedAt = useRef(Date.now());

  // Each step is a new screen: start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const changedScreens = [
    JSON.stringify(care) !== JSON.stringify({ visitDate: initial.visitDate, reminderTime: initial.reminderTime, watchConnected: initial.watchConnected }),
    JSON.stringify(usual) !== JSON.stringify(initial.usual),
    JSON.stringify(meds) !== JSON.stringify(initial.medications),
    JSON.stringify(isi) !== JSON.stringify(initial.isi),
    JSON.stringify(screening) !== JSON.stringify(initial.screening),
  ].filter(Boolean).length;

  function finish() {
    startSaving(async () => {
      const r = await saveOnboarding({
        consent: true,
        ...care,
        usual,
        medications: meds,
        isi,
        screening,
        changed: changedScreens,
        durationMs: Date.now() - startedAt.current,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setStep(6);
    });
  }

  const next = () => (step === 5 ? finish() : setStep(step + 1));
  const canContinue = step !== 0 || consent;

  if (step === 6) {
    return (
      <PatientShell>
        <ProgressDots step={6} />
        <MoonMark className="mt-10 size-16" />
        <h1 className="mt-8 font-display text-[40px] leading-[1.08]">You&apos;re all set, {firstName}.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          Each morning at {care.reminderTime.replace(/^0/, "")} you&apos;ll get a short message. Tap it and tell me how you
          slept: about a minute.
        </p>
        <SoftCard className="mt-8 space-y-2 text-[15px] leading-relaxed">
          <p className="font-semibold">For this demo</p>
          <p className="text-muted-foreground">
            Maya has already been using SleepStory for 8 weeks, so you&apos;ll see her history. Your changes are saved to her
            profile{changedScreens ? ` (you changed ${changedScreens} screen${changedScreens === 1 ? "" : "s"})` : ""}.
          </p>
        </SoftCard>
        <div className="mt-auto pt-8">
          <Button variant="brand" size="xl" onClick={() => router.push("/patient")}>
            Go to Maya&apos;s morning
          </Button>
        </div>
      </PatientShell>
    );
  }

  return (
    <PatientShell>
      <div className="flex items-center justify-between">
        {step === 0 ? (
          <Link href="/patient" className="font-semibold text-primary underline underline-offset-4">
            Skip
          </Link>
        ) : (
          <button type="button" className="font-semibold text-primary underline underline-offset-4" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <span className="text-sm text-muted-foreground">
          {step + 1} of {STEPS.length}
        </span>
      </div>
      <ProgressDots step={step} />

      {step > 0 && (
        <p className="mt-6 flex items-center gap-2 rounded-2xl bg-brand-soft px-4 py-2.5 text-sm">
          <Sparkles className="size-4 shrink-0 text-brand" /> Maya&apos;s answers are filled in. Change anything you like.
        </p>
      )}

      {step === 0 && (
        <>
          <MoonMark className="mt-8 size-12" />
          <h1 className="mt-5 font-display text-[36px] leading-[1.1]">Welcome to SleepStory</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">
            A one-minute morning check-in, and a one-page summary for your primary care provider before each visit.
          </p>
          <SoftCard className="mt-6">
            <p className="flex items-center gap-2 font-semibold">
              <Lock className="size-4 text-primary" /> Your privacy, in short
            </p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-muted-foreground">
              <li>We collect your sleep answers, the words you use, habits and questionnaire answers.</li>
              <li>Nothing reaches your provider until you tap Approve &amp; share.</li>
              <li>The AI runs on a self-hosted model; your text isn&apos;t sent to OpenAI or Google.</li>
              <li>You can correct, skip or delete anything.</li>
            </ul>
            <Link href="/patient/privacy" className="mt-3 inline-block text-sm font-semibold text-primary underline underline-offset-4">
              Read the full privacy page
            </Link>
          </SoftCard>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border/60">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5 size-5" />
            <span className="text-[15px] leading-relaxed">
              I understand how my information is used, and that I approve every share with my provider.
            </span>
          </label>
        </>
      )}

      {step === 1 && (
        <>
          <Title>Your care</Title>
          <SoftCard className="mt-5 space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">Your primary care provider</p>
              <p className="font-semibold">{providerName}</p>
              <p className="text-xs text-muted-foreground">Simulated for the demo</p>
            </div>
            <Field label="Next visit" id="visit">
              <Input id="visit" type="date" value={care.visitDate} onChange={(e) => e.target.value && setCare({ ...care, visitDate: e.target.value })} className={INPUT} />
              <p className="mt-1 text-xs text-muted-foreground">{formatDateLong(care.visitDate)}</p>
            </Field>
            <Field label="Morning reminder" id="reminder">
              <Input id="reminder" type="time" value={care.reminderTime} onChange={(e) => e.target.value && setCare({ ...care, reminderTime: e.target.value })} className={INPUT} />
            </Field>
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Sleep watch</p>
              <Toggle
                variant="outline"
                className={CHIP}
                pressed={care.watchConnected}
                onPressedChange={(on) => setCare({ ...care, watchConnected: on })}
              >
                <Watch /> {care.watchConnected ? "Watch connected (demo)" : "Connect watch (demo)"}
              </Toggle>
              <p className="mt-2 text-xs text-muted-foreground">
                Optional. Your answers always come first; the watch is only a cross-check.
              </p>
            </div>
          </SoftCard>
        </>
      )}

      {step === 2 && (
        <>
          <Title>Your usual day</Title>
          <p className="mt-2 text-[15px] text-muted-foreground">So the app can tell when a day was different.</p>
          <SoftCard className="mt-5 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Usually in bed by" id="inbed">
                <Input id="inbed" type="time" value={usual.inBed} onChange={(e) => e.target.value && setUsual({ ...usual, inBed: e.target.value })} className={INPUT} />
              </Field>
              <Field label="Usually up at" id="up">
                <Input id="up" type="time" value={usual.outOfBed} onChange={(e) => e.target.value && setUsual({ ...usual, outOfBed: e.target.value })} className={INPUT} />
              </Field>
            </div>
            <Chips label="Coffee, tea or energy drinks" options={CAFFEINE_OPTIONS} value={usual.caffeine} onChange={(v) => setUsual({ ...usual, caffeine: v })} />
            <Chips label="Alcohol" options={ALCOHOL_OPTIONS} value={usual.alcohol} onChange={(v) => setUsual({ ...usual, alcohol: v })} />
            <Chips label="Exercise" options={EXERCISE_OPTIONS} value={usual.exercise} onChange={(v) => setUsual({ ...usual, exercise: v })} />
            <OtherHabits value={usual.other} onChange={(other) => setUsual({ ...usual, other })} />
          </SoftCard>
        </>
      )}

      {step === 3 && <MedicinesStep meds={meds} setMeds={setMeds} />}

      {step === 4 && (
        <>
          <Title>Sleep check</Title>
          <p className="mt-2 text-[15px] text-muted-foreground">
            7 standard questions about the last 2 weeks (Insomnia Severity Index). You&apos;ll answer them again before your
            visit, so your provider can see what changed.
          </p>
          <div className="mt-5 space-y-3">
            {ISI_ITEMS.map((item, i) => (
              <SoftCard key={item.text} className="p-4">
                <p className="text-[15px] font-semibold leading-snug">{item.text}</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="mt-3 grid w-full grid-cols-5 gap-1.5"
                  value={String(isi[i])}
                  onValueChange={(v) => v && setIsi(isi.map((x, j) => (j === i ? Number(v) : x)) as IsiAnswers)}
                >
                  {ISI_SCALES[item.scale].map((label, v) => (
                    <ToggleGroupItem key={label} value={String(v)} className="h-14 rounded-2xl! border-2! px-0.5 text-[11px] leading-tight font-semibold whitespace-normal">
                      {label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </SoftCard>
            ))}
          </div>
        </>
      )}

      {step === 5 && <SafetyStep screening={screening} setScreening={setScreening} />}

      <div className="sticky bottom-0 -mx-6 mt-auto bg-gradient-to-t from-background from-70% to-transparent px-6 pt-8 pb-4">
        <Button variant="brand" size="xl" disabled={!canContinue || saving} onClick={next}>
          {saving ? <Loader2 className="animate-spin" /> : step === 5 ? <Check /> : null}
          {step === 0 ? "I agree, let's start" : step === 5 ? "Finish" : "Next"}
        </Button>
      </div>
    </PatientShell>
  );
}

const INPUT = "h-12 rounded-2xl border-0 bg-surface-2 text-lg font-semibold focus-visible:ring-2 focus-visible:ring-brand dark:bg-surface-2";

/** One dot per onboarding screen; the current one is a longer pill. */
function ProgressDots({ step }: { step: number }) {
  return (
    <ol className="mt-5 flex items-center gap-2" aria-label={`Step ${Math.min(step + 1, STEPS.length)} of ${STEPS.length}`}>
      {STEPS.map((name, i) => (
        <li
          key={name}
          title={name}
          aria-current={i === step ? "step" : undefined}
          className={cn(
            "h-2.5 rounded-full transition-all",
            i === step ? "w-8 bg-brand" : i < step ? "w-2.5 bg-brand" : "w-2.5 bg-border",
          )}
        />
      ))}
    </ol>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h1 className="mt-6 font-display text-[34px] leading-[1.1]">{children}</h1>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2 block text-sm font-normal text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Chips<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted-foreground">{label}</legend>
      <ToggleGroup type="single" variant="outline" className="flex flex-wrap justify-start gap-2" value={value} onValueChange={(v) => v && onChange(v as T)}>
        {options.map((o) => (
          <ToggleGroupItem key={o} value={o} className="h-10 rounded-full! border-2! px-4 text-sm font-semibold">
            {o}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
  );
}

/** Any habit in the patient's own words: removable pills plus an add box. */
function OtherHabits({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const h = draft.trim();
    if (h && !value.some((x) => x.toLowerCase() === h.toLowerCase())) onChange([...value, h.slice(0, 40)].slice(0, 8));
    setDraft("");
  };
  return (
    <fieldset>
      <legend className="mb-2 text-sm text-muted-foreground">Other habits</legend>
      {value.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {value.map((h) => (
            <li key={h} className="flex h-10 items-center gap-1 rounded-full border-2 border-brand bg-brand pr-1 pl-4 text-sm font-semibold text-brand-foreground">
              {h}
              <button
                type="button"
                aria-label={`Remove ${h}`}
                onClick={() => onChange(value.filter((x) => x !== h))}
                className="flex size-7 items-center justify-center rounded-full hover:bg-brand-foreground/10"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          aria-label="Add another habit"
          placeholder="e.g. late-night gaming, shift work"
          maxLength={40}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className="h-11 flex-1 rounded-2xl border-0 bg-surface-2 text-base focus-visible:ring-2 focus-visible:ring-brand dark:bg-surface-2"
        />
        <Button variant="outline" className="h-11 rounded-full px-4" disabled={!draft.trim()} onClick={add}>
          <Plus /> Add
        </Button>
      </div>
    </fieldset>
  );
}

function MedicinesStep({ meds, setMeds }: { meds: Medication[]; setMeds: (m: Medication[]) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SleepAid>("otc");
  const update = (i: number, m: Medication) => setMeds(meds.map((x, j) => (j === i ? m : x)));

  return (
    <>
      <Title>Sleep medicines</Title>
      <p className="mt-2 text-[15px] text-muted-foreground">
        Anything you take to help you sleep, prescribed or not. Each morning you&apos;ll just tap which one you took.
      </p>
      <div className="mt-5 space-y-3">
        {meds.length === 0 && <SoftCard className="text-[15px] text-muted-foreground">No sleep medicines. That&apos;s fine.</SoftCard>}
        {meds.map((m, i) => (
          <SoftCard key={i} className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-semibold">
                <Pill className="size-4 text-brand" /> {m.name}
              </p>
              <Button size="icon-sm" variant="ghost" aria-label={`Remove ${m.name}`} onClick={() => setMeds(meds.filter((_, j) => j !== i))}>
                <X />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {KIND_LABEL[m.kind]} · {m.startedBy === "provider" ? "prescribed by my provider" : "I started it myself"}
            </p>
            {m.kind === "prescription" && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">What did your provider say?</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Toggle
                    variant="outline"
                    className="h-10 rounded-full! border-2! px-4 text-sm font-semibold"
                    pressed={m.plan?.type === "as_needed"}
                    onPressedChange={(on) => on && update(i, { ...m, plan: { type: "as_needed", maxPerWeek: 3 } })}
                  >
                    As needed
                  </Toggle>
                  <Toggle
                    variant="outline"
                    className="h-10 rounded-full! border-2! px-4 text-sm font-semibold"
                    pressed={m.plan?.type === "nightly"}
                    onPressedChange={(on) => on && update(i, { ...m, plan: { type: "nightly" } })}
                  >
                    Every night
                  </Toggle>
                </div>
                {m.plan?.type === "as_needed" && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">Up to</span>
                    <Button size="icon-sm" variant="outline" aria-label="Fewer nights" disabled={m.plan.maxPerWeek <= 1} onClick={() => update(i, { ...m, plan: { type: "as_needed", maxPerWeek: (m.plan as { maxPerWeek: number }).maxPerWeek - 1 } })}>
                      −
                    </Button>
                    <span className="w-4 text-center font-semibold tabular-nums">{m.plan.maxPerWeek}</span>
                    <Button size="icon-sm" variant="outline" aria-label="More nights" disabled={m.plan.maxPerWeek >= 7} onClick={() => update(i, { ...m, plan: { type: "as_needed", maxPerWeek: (m.plan as { maxPerWeek: number }).maxPerWeek + 1 } })}>
                      +
                    </Button>
                    <span className="text-muted-foreground">nights a week</span>
                  </div>
                )}
                {planText(m) && <p className="text-xs text-muted-foreground">Plan: {planText(m)}</p>}
              </div>
            )}
          </SoftCard>
        ))}

        <SoftCard className="space-y-3 p-4">
          <Label htmlFor="new-med" className="font-semibold">
            Add a medicine
          </Label>
          <Input id="new-med" placeholder="Name, e.g. Nytol" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl border-0 bg-surface-2 text-base dark:bg-surface-2" />
          <ToggleGroup type="single" variant="outline" className="flex flex-wrap justify-start gap-2" value={kind} onValueChange={(v) => v && setKind(v as SleepAid)}>
            {(Object.keys(KIND_LABEL) as SleepAid[]).map((k) => (
              <ToggleGroupItem key={k} value={k} className="h-9 rounded-full! border-2! px-3 text-sm font-semibold">
                {KIND_LABEL[k]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            variant="outline"
            className="w-full rounded-full"
            disabled={!name.trim()}
            onClick={() => {
              const presc = kind === "prescription";
              setMeds([...meds, { name: name.trim(), kind, startedBy: presc ? "provider" : "self", plan: presc ? { type: "as_needed", maxPerWeek: 3 } : null }]);
              setName("");
            }}
          >
            <Plus /> Add
          </Button>
        </SoftCard>
        <p className="px-1 text-xs text-muted-foreground">{MEDICINE_SAFETY_LINE}</p>
      </div>
    </>
  );
}

function SafetyStep({ screening, setScreening }: { screening: Screening; setScreening: (s: Screening) => void }) {
  const yesNo = (key: keyof typeof SCREENING_QUESTIONS) => (
    <SoftCard key={key} className="p-4">
      <p className="text-[15px] font-semibold leading-snug">{SCREENING_QUESTIONS[key]}</p>
      <ToggleGroup
        type="single"
        variant="outline"
        className="mt-3 grid w-full grid-cols-2 gap-2"
        value={screening[key] ? "yes" : "no"}
        onValueChange={(v) => v && setScreening({ ...screening, [key]: v === "yes" })}
      >
        <ToggleGroupItem value="no" className="h-11 rounded-2xl! border-2! font-semibold">
          No
        </ToggleGroupItem>
        <ToggleGroupItem value="yes" className="h-11 rounded-2xl! border-2! font-semibold">
          Yes
        </ToggleGroupItem>
      </ToggleGroup>
      {/* SAFE-05: drowsy driving gets an immediate message, not one delayed until the visit */}
      {key === "drowsyDriving" && screening.drowsyDriving && (
        <p className="mt-3 flex items-start gap-2 rounded-2xl bg-warn px-3 py-2.5 text-sm text-warn-foreground">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          Please don&apos;t drive when you feel sleepy. Pull over somewhere safe if it happens. This is worth talking about
          with your provider soon, not only at your next visit.
        </p>
      )}
    </SoftCard>
  );
  const anyFlag =
    screening.snoringOrApnea || screening.restlessLegs || screening.drowsyDriving || screening.phq2[0] + screening.phq2[1] >= 3;

  return (
    <>
      <Title>A few health questions</Title>
      <p className="mt-2 text-[15px] text-muted-foreground">Some sleep problems have other causes worth checking.</p>
      <div className="mt-5 space-y-3">
        {(["snoringOrApnea", "restlessLegs", "drowsyDriving"] as const).map(yesNo)}
        <p className="px-1 pt-2 text-sm text-muted-foreground">Over the last 2 weeks, how often have you been bothered by…</p>
        {PHQ2_ITEMS.map((q, i) => (
          <SoftCard key={q} className="p-4">
            <p className="text-[15px] font-semibold leading-snug">{q}</p>
            <ToggleGroup
              type="single"
              variant="outline"
              className="mt-3 grid w-full grid-cols-2 gap-2"
              value={String(screening.phq2[i])}
              onValueChange={(v) => v && setScreening({ ...screening, phq2: screening.phq2.map((x, j) => (j === i ? Number(v) : x)) as [number, number] })}
            >
              {PHQ2_OPTIONS.map((o, v) => (
                <ToggleGroupItem key={o} value={String(v)} className="h-12 rounded-2xl! border-2! px-2 text-sm leading-tight font-semibold whitespace-normal">
                  {o}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </SoftCard>
        ))}
        {/* SAFE-04: a calm message for the patient; the provider sees the details */}
        {anyFlag && (
          <p className="rounded-2xl bg-brand-soft px-4 py-3 text-[15px] leading-relaxed">
            Thanks for answering. Some of your answers are worth discussing with your provider; they&apos;ll be on your
            Sleep Snapshot.
          </p>
        )}
      </div>
    </>
  );
}
