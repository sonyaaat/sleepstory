"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BedDouble, Bot, Check, ChevronRight, Coffee, Flame, HelpCircle, Hourglass, Keyboard, Loader2, Mic, MoonStar, Pencil, Pill, Plus, Square, Stethoscope, Sunrise, Watch, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MoonMark, MorningDots, PatientShell, SoftCard } from "@/components/brand";
import { answerWatch, logClientEvent, saveCheckin, type CheckinResult } from "@/app/actions";
import type { ExtractionResult } from "@/adapters/llm/types";
import { followUpQuestion, type DayStreak, type UsualTimes } from "@/core/checkin";
import { MEDICINE_SAFETY_LINE } from "@/core/medications";
import { consistencyIssues } from "@/core/metrics";
import {
  DiaryEntrySchema,
  FIELD_META,
  ASKED_FIELDS,
  DERIVED_FROM,
  FIELD_ORDER,
  HABITS,
  QUALITY_LABELS,
  WOKE_REASONS,
  UNKNOWABLE,
  type DiaryEntry,
  type DiaryFieldKey,
  type HabitKey,
  type SleepAid,
  type WokeReason,
} from "@/core/schema";
import { formatClock, formatClock12, formatDuration, nightMinutes, parseClock } from "@/core/time";
import { cn } from "@/lib/utils";
import { FieldInput, QUALITY_FACES, type FieldValue } from "./field-input";
import { useSpeech } from "./use-speech";

type Step = "voice" | "type" | "review" | "extras" | "done";
type Values = Partial<Record<DiaryFieldKey, FieldValue>>;
type Saved = Extract<CheckinResult, { ok: true }>;

/** One colour per idea, used on every check-in screen so the same thing always looks the same. */
const TONE = {
  bed: "bg-indigo-100 text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300",
  asleep: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300",
  night: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  wake: "bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300",
  pill: "bg-rose-100 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
  day: "bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300",
  provider: "bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  mood: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
} as const;
type Tone = keyof typeof TONE;

/** A coloured rounded square with an icon in it. */
function IconBadge({ icon: Icon, tone, className }: { icon: LucideIcon; tone: Tone; className?: string }) {
  return (
    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", TONE[tone], className)}>
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

/** Wake reasons shown first; the rest sit behind "More…". */
const COMMON_WOKE = new Set<WokeReason>(["worry", "bathroom", "noise", "phone", "pain"]);

const SMALL_CHIP = "h-10 rounded-full! border-2! px-3.5 text-sm font-semibold";
/** "+ Other" stands apart from the options: dashed border, primary colour. */
const OTHER_CHIP = cn(SMALL_CHIP, "border-dashed! text-primary");
const INPUT = "mt-3 h-11 rounded-2xl border-0 bg-surface-2 text-base focus-visible:ring-2 focus-visible:ring-brand dark:bg-surface-2";

export function CheckinFlow({
  initialMode,
  medicines,
  usual,
  firstName,
}: {
  initialMode: "voice" | "type" | "quick";
  usual: UsualTimes;
  firstName: string;
  /** The patient's own sleep medicines, from registration (MED-01). */
  medicines: { name: string; kind: SleepAid; planText: string | null }[];
}) {
  const [step, setStep] = useState<Step>(initialMode === "quick" ? "review" : initialMode);
  /** Answering by tapping options instead of talking or typing (CHK-10). */
  const [manual, setManual] = useState(initialMode === "quick");
  const [story, setStory] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [values, setValues] = useState<Values>({});
  const [assumed, setAssumed] = useState<Set<DiaryFieldKey>>(new Set());
  const [wokeReasons, setWokeReasons] = useState<WokeReason[]>([]);
  const [wakeNote, setWakeNote] = useState("");
  const [showWakeOther, setShowWakeOther] = useState(false);
  const [allReasons, setAllReasons] = useState(false);
  const [showDayOther, setShowDayOther] = useState(false);
  const [dayOther, setDayOther] = useState("");
  const [habits, setHabits] = useState<HabitKey[]>([]);
  // MED-02: which of her medicines she took, plus anything new she names.
  const [meds, setMeds] = useState<string[]>([]);
  const [otherMed, setOtherMed] = useState("");
  const [showOther, setShowOther] = useState(false);
  // One-tap confirm for answers marked "please check".
  const [confirmed, setConfirmed] = useState<Set<DiaryFieldKey>>(new Set());
  /** Ticks the patient's own medicine of this kind, if she has one; otherwise asks for the name. */
  function preselectAid(kind: SleepAid) {
    const mine = medicines.find((m) => m.kind === kind);
    if (mine) setMeds((prev) => (prev.includes(mine.name) ? prev : [...prev, mine.name]));
    else setShowOther(true);
  }
  const [editing, setEditing] = useState<DiaryFieldKey | null>(null);
  // CHK-16: answers the patient doesn't know are saved as "unknown", never guessed.
  const [unknown, setUnknown] = useState<Set<DiaryFieldKey>>(new Set());
  // CHK-15: facts worth telling the provider (from the story, or added by the patient).
  const [notes, setNotes] = useState<{ text: string; fromStory: boolean }[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [result, setResult] = useState<Saved | null>(null);
  const [watchAnswered, setWatchAnswered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, startSaving] = useTransition();
  const startedAt = useRef(Date.now());
  const storyRef = useRef("");
  storyRef.current = story;

  // Each step is a new screen: start it at the top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  useEffect(() => {
    startedAt.current = Date.now();
    logClientEvent("checkin_started", { mode: initialMode }).catch(() => {});
  }, [initialMode]);

  const speech = useSpeech((text) => setStory((s) => (s ? `${s} ${text}` : text)));
  const notesSpeech = useSpeech((text) => setNoteDraft((s) => (s ? `${s} ${text}` : text)));

  function addNote() {
    const text = noteDraft.trim();
    if (!text) return;
    setNotes((n) => [...n, { text: text.slice(0, 200), fromStory: false }].slice(0, 8));
    setNoteDraft("");
  }

  // ---- Story -> extraction ----
  async function readStory(text = storyRef.current) {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: text }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Something went wrong");
      const r: ExtractionResult = await res.json();
      setExtraction(r);
      const v: Values = {};
      const a = new Set<DiaryFieldKey>();
      for (const k of FIELD_ORDER) {
        const f = r.fields[k];
        if (f) {
          v[k] = f.value;
          if (f.assumed) a.add(k);
        }
      }
      setValues(v);
      setAssumed(a);
      setUnknown(new Set());
      setConfirmed(new Set());
      setNotes(r.notes.map((n) => ({ text: n.fact, fromStory: true })));
      setHabits(r.habits);
      if (r.sleepAid) preselectAid(r.sleepAid);
      setManual(false);
      setStep("review");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function finishVoice() {
    speech.stop();
    // Give the browser a moment to deliver the last words.
    setTimeout(() => readStory(), 500);
  }

  // ---- Review helpers ----
  const entryValues = Object.fromEntries(
    FIELD_ORDER.map((k) => {
      // Not asked: taken from another answer (see DERIVED_FROM).
      const src = DERIVED_FROM[k] ?? k;
      const v = values[src];
      // Left empty = "I don't know" (null). Only sleep quality must be answered.
      if (unknown.has(src) || v === undefined || v === "") return [k, k === "quality" ? undefined : null];
      return [k, v];
    }),
  );
  const parsed = DiaryEntrySchema.safeParse(entryValues);
  const complete = parsed.success;
  const issues = complete ? consistencyIssues(parsed.data) : [];
  const qualityMissing = values.quality === undefined || values.quality === "";

  const corrected = useMemo(() => {
    if (!extraction) return 0;
    return ASKED_FIELDS.filter((k) => extraction.fields[k] && extraction.fields[k]!.value !== values[k]).length;
  }, [extraction, values]);

  function setField(k: DiaryFieldKey, v: FieldValue) {
    setValues((prev) => ({ ...prev, [k]: v }));
    setUnknown((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    setAssumed((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
    setConfirmed((prev) => new Set(prev).add(k));
  }

  function chooseAmbiguity(value: string | number) {
    if (!extraction?.ambiguity) return;
    // A clock time means it was when they woke, so the awake duration stays for the patient to fill in.
    if (typeof value === "number") setField(extraction.ambiguity.field, value);
    setExtraction({ ...extraction, ambiguity: null });
  }

  // From the answers so far, so the question doesn't pop in only after sleep quality is picked.
  const num = (k: DiaryFieldKey) => (unknown.has(k) || values[k] === undefined || values[k] === "" ? null : Number(values[k]));
  const followUp = followUpQuestion({ awakenings: num("awakenings"), solMin: num("solMin") });

  // ---- Tap answers (CHK-10): the same review page, empty, with options under each question ----
  function startManual() {
    setExtraction(null);
    setValues({});
    setAssumed(new Set());
    setUnknown(new Set());
    setConfirmed(new Set());
    setManual(true);
    setStep("review");
  }

  function pick(k: DiaryFieldKey, v: string | number) {
    setField(k, v);
    // No wakings means no time awake in the night.
    if (k === "awakenings" && v === 0 && (values.wasoMin === undefined || values.wasoMin === "")) setField("wasoMin", 0);
  }

  /** An answer the AI wasn't sure about, not yet confirmed or changed. */
  function needsCheck(k: DiaryFieldKey) {
    const f = extraction?.fields[k];
    const v = values[k];
    if (!f || unknown.has(k) || confirmed.has(k) || assumed.has(k)) return false;
    return v !== undefined && v !== "" && f.value === v && f.confidence !== "high";
  }

  const medicinesTaken = [...meds, ...(showOther ? [otherMed.trim()] : [])].filter(Boolean);

  // ---- Save ----
  function save() {
    const fields = DiaryEntrySchema.parse(entryValues) as DiaryEntry;
    startSaving(async () => {
      const r = await saveCheckin({
        fields,
        mode: "full",
        habits,
        medicines: medicinesTaken,
        wokeReasons: followUp ? wokeReasons : [],
        wakeNote: followUp && showWakeOther ? wakeNote.trim() || null : null,
        story: story.trim() || null,
        dayNote: showDayOther ? dayOther.trim() || null : null,
        providerNotes: notes.map((n) => n.text.trim()).filter(Boolean),
        quote: extraction?.quote ?? null,
        aiMode: extraction ? extraction.mode : "manual",
        aiFieldsCorrected: corrected,
        durationMs: Date.now() - startedAt.current,
      });
      if (!r.ok) {
        toast.error(r.errors.join(" "));
        setStep("review");
        return;
      }
      setResult(r);
      setStep("done");
    });
  }

  // ================= Screens =================

  if (step === "voice") {
    return (
      <VoiceScreen
        speech={speech}
        story={story}
        setStory={setStory}
        loading={loading}
        onFinish={finishVoice}
        onType={() => {
          speech.stop();
          setStep("type");
        }}
      />
    );
  }

  if (step === "type") {
    return (
      <PatientShell>
        <TopLink href="/patient" label="Back" />
        <p className="mt-8 text-[17px] text-muted-foreground">Good morning, {firstName}</p>
        <h1 className="mt-1.5 font-display text-[36px] leading-[1.1]">Tell me about last night</h1>
        <StoryHints className="mt-6" />
        <Label htmlFor="story" className="sr-only">
          Your night
        </Label>
        <Textarea
          id="story"
          rows={7}
          autoFocus
          className="mt-6 min-h-44 rounded-3xl border-0 bg-card p-5 text-lg leading-relaxed ring-1 ring-border/60 placeholder:text-muted-foreground/70 focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-brand dark:bg-card"
          placeholder="Went to bed around 12:30, took about an hour to fall asleep, woke up twice…"
          value={story}
          onChange={(e) => setStory(e.target.value)}
        />
        {speech.supported && (
          <Button variant="ghost" className="mt-3 self-start" onClick={() => setStep("voice")}>
            <Mic /> Speak instead
          </Button>
        )}
        <div className="mt-auto space-y-3 pt-8">
          <Button variant="brand" size="xl" disabled={!story.trim() || loading} onClick={() => readStory()}>
            {loading ? (
              <>
                <Loader2 className="animate-spin" /> Reading your story…
              </>
            ) : (
              "Continue"
            )}
          </Button>
          <button
            type="button"
            className="w-full py-2 text-center font-semibold text-primary underline underline-offset-4"
            onClick={startManual}
          >
            Rather tap your answers
          </button>
        </div>
      </PatientShell>
    );
  }

  if (step === "review") {
    const rows = ASKED_FIELDS.filter((k) => k !== "quality");
    return (
      <PatientShell>
        <div className="flex items-center justify-between">
          {manual && initialMode === "quick" ? (
            <Link href="/patient" className="font-semibold text-primary underline underline-offset-4">
              Back
            </Link>
          ) : (
            <button
              type="button"
              className="font-semibold text-primary underline underline-offset-4"
              onClick={() => setStep(manual ? "type" : initialMode === "voice" && speech.supported ? "voice" : "type")}
            >
              {manual ? "Back" : initialMode === "voice" ? "Record again" : "Edit my words"}
            </button>
          )}
          {extraction && <AiPanel extraction={extraction} />}
        </div>
        <h1 className="mt-6 font-display text-[36px] leading-[1.1]">{extraction ? "Here's what I heard" : "Your night"}</h1>
        <p className="mt-2 text-[17px] text-muted-foreground">{manual ? "Tap an answer for each." : "Tap a line to change it."}</p>

        {extraction?.mode === "fallback" && (
          <p className="mt-4 rounded-2xl bg-warn px-4 py-3 text-sm text-warn-foreground">
            The AI wasn&apos;t available, so please check each line.
          </p>
        )}

        <ul className="mt-4 divide-y divide-border/70 rounded-3xl bg-card px-3 ring-1 ring-border/60">
          {rows.map((k) => {
            const v = values[k];
            const isUnknown = unknown.has(k);
            const isMissing = !isUnknown && (v === undefined || v === "");
            const f = extraction?.fields[k];
            const approx = f && f.value === v && f.confidence === "medium";
            const check = needsCheck(k);
            const ask = extraction?.ambiguity?.field === k ? extraction.ambiguity : null;
            const picks = manual && isMissing ? quickPicks(k, usual) : null;
            const inline = Boolean(ask || picks);
            return (
              <li key={k} className={cn("py-1", ask && "-mx-3 bg-brand-soft px-3")}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(k)}
                    aria-label={`Change: ${FIELD_META[k].label}`}
                    className="flex min-h-14 flex-1 items-center justify-between gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:bg-surface-2"
                  >
                    <span className={cn("text-[15px]", inline ? "font-semibold" : "text-muted-foreground")}>
                      {FIELD_META[k].label}
                    </span>
                    {!inline && (
                      <span className="ml-auto flex flex-col items-end">
                        <span
                          className={cn(
                            "text-right font-semibold whitespace-nowrap",
                            (isUnknown || isMissing) && "text-muted-foreground",
                          )}
                        >
                          {isUnknown || isMissing ? "Don't know" : formatValue(k, v!, approx)}
                        </span>
                        {!isMissing && !isUnknown && assumed.has(k) && (
                          <span className="text-xs text-muted-foreground">from your usual times</span>
                        )}
                      </span>
                    )}
                    {!check && !inline && <ChevronRight className="size-4 shrink-0 text-muted-foreground/60" />}
                  </button>
                  {check && (
                    <Button
                      size="icon"
                      variant="outline"
                      className="size-9 shrink-0 rounded-full border-2 border-brand"
                      aria-label={`Confirm: ${FIELD_META[k].label}`}
                      onClick={() => setConfirmed((prev) => new Set(prev).add(k))}
                    >
                      <Check className="size-4" />
                    </Button>
                  )}
                </div>
                {ask && (
                  <div className="flex flex-wrap gap-2 px-2 pb-3" role="group" aria-label={ask.question}>
                    {ask.options.map((o) => (
                      <Button
                        key={o.label}
                        variant="outline"
                        className="h-10 rounded-full bg-card"
                        onClick={() => chooseAmbiguity(o.value)}
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                )}
                {picks && (
                  <div className="flex flex-wrap gap-2 px-2 pb-3" role="group" aria-label={FIELD_META[k].label}>
                    {picks.map((o) => (
                      <Button key={o.label} variant="outline" className="h-10 rounded-full" onClick={() => pick(k, o.value)}>
                        {o.label}
                      </Button>
                    ))}
                    {FIELD_META[k].kind === "clock" && (
                      <Button variant="ghost" className="h-10 rounded-full px-3" onClick={() => setEditing(k)}>
                        Other…
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <section className="mt-4 rounded-3xl bg-card p-5 ring-1 ring-border/60" aria-labelledby="quality-title">
          <h2 id="quality-title" className="mb-3 font-semibold">
            How did you sleep?
          </h2>
          <FieldInput name="quality" value={values.quality} onChange={(v) => setField("quality", v)} />
        </section>

        {issues.length > 0 && (
          <div className="mt-4 rounded-2xl bg-warn px-4 py-3 text-sm text-warn-foreground">
            <p className="font-semibold">Something doesn&apos;t add up</p>
            <ul className="mt-1 list-disc pl-4">
              {issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="sticky bottom-0 -mx-6 mt-6 bg-gradient-to-t from-background from-70% to-transparent px-6 pt-6 pb-4">
          <Button variant="brand" size="xl" disabled={!complete || issues.length > 0} onClick={() => setStep("extras")}>
            {qualityMissing ? "Pick how you slept" : "Next"}
          </Button>
        </div>

        <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
          <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl px-6 pb-8">
            {editing && (
              <>
                <SheetHeader className="px-0">
                  <SheetTitle className="font-display text-2xl font-normal">{FIELD_META[editing].label}</SheetTitle>
                  <SheetDescription>Change it to what really happened.</SheetDescription>
                </SheetHeader>
                <FieldInput name={editing} value={unknown.has(editing) ? undefined : values[editing]} onChange={(v) => setField(editing, v)} />
                <Button variant="brand" size="xl" className="mt-6" onClick={() => setEditing(null)}>
                  Done
                </Button>
                {UNKNOWABLE.includes(editing) && (
                  <Button
                    variant="ghost"
                    size="xl"
                    className="mt-1"
                    onClick={() => {
                      const k = editing;
                      setUnknown((prev) => new Set(prev).add(k));
                      setValues((prev) => ({ ...prev, [k]: undefined }));
                      setEditing(null);
                    }}
                  >
                    <HelpCircle /> I don&apos;t know
                  </Button>
                )}
              </>
            )}
          </SheetContent>
        </Sheet>
      </PatientShell>
    );
  }

  if (step === "extras") {
    const otherMissing = showOther && !otherMed.trim();
    return (
      <PatientShell>
        <button
          type="button"
          className="self-start font-semibold text-primary underline underline-offset-4"
          onClick={() => setStep("review")}
        >
          Back
        </button>
        <h1 className="mt-6 font-display text-[36px] leading-[1.1]">Anything else?</h1>

        <section className="mt-6 divide-y divide-border/70 rounded-3xl bg-card px-5 ring-1 ring-border/60">
        {followUp && (
          <Extra icon={MoonStar} tone="night" title={followUp === "woke_reason" ? "What woke you?" : "What kept you awake?"}>
            <div className="flex flex-wrap gap-2">
              <ToggleGroup
                type="multiple"
                variant="outline"
                className="contents"
                value={wokeReasons}
                onValueChange={(v) => setWokeReasons(v as WokeReason[])}
              >
                {WOKE_REASONS.filter((r) => allReasons || COMMON_WOKE.has(r.key) || wokeReasons.includes(r.key)).map((r) => (
                  <ToggleGroupItem key={r.key} value={r.key} className={SMALL_CHIP}>
                    {r.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              {!allReasons && (
                <Button variant="ghost" className="h-10 rounded-full px-3.5 text-sm font-semibold" onClick={() => setAllReasons(true)}>
                  More…
                </Button>
              )}
              <Toggle variant="outline" className={OTHER_CHIP} pressed={showWakeOther} onPressedChange={setShowWakeOther}>
                <Plus /> Other
              </Toggle>
            </div>
            {showWakeOther && (
              <Input
                autoFocus
                aria-label="What woke you, in your own words"
                placeholder="e.g. my roommate came home late"
                maxLength={200}
                value={wakeNote}
                onChange={(e) => setWakeNote(e.target.value)}
                className={INPUT}
              />
            )}
          </Extra>
        )}

        <Extra icon={Pill} tone="pill" title="Medication">
          <div className="flex flex-wrap gap-2">
            {medicines.length > 0 && (
              <ToggleGroup type="multiple" variant="outline" className="contents" value={meds} onValueChange={setMeds}>
                {medicines.map((m) => (
                  <ToggleGroupItem
                    key={m.name}
                    value={m.name}
                    title={m.planText ? `Your plan: ${m.planText}` : undefined}
                    className={SMALL_CHIP}
                  >
                    {m.name}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
            <Toggle
              variant="outline"
              className={OTHER_CHIP}
              pressed={showOther}
              onPressedChange={(on) => {
                setShowOther(on);
                if (!on) setOtherMed("");
              }}
            >
              <Plus /> Other
            </Toggle>
          </div>
          {showOther && (
            <Input
              autoFocus
              aria-label="Name of the medication"
              placeholder="Name, e.g. Nytol"
              maxLength={60}
              value={otherMed}
              onChange={(e) => setOtherMed(e.target.value)}
              className={INPUT}
            />
          )}
          {medicinesTaken.length > 0 && <p className="mt-3 text-xs text-muted-foreground">{MEDICINE_SAFETY_LINE}</p>}
        </Extra>

        <Extra icon={Coffee} tone="day" title="Anything different yesterday?">
          <div className="flex flex-wrap gap-2">
            <ToggleGroup
              type="multiple"
              variant="outline"
              className="contents"
              value={habits}
              onValueChange={(v) => setHabits(v as HabitKey[])}
            >
              {HABITS.map((h) => (
                <ToggleGroupItem key={h.key} value={h.key} className={SMALL_CHIP}>
                  {h.short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Toggle variant="outline" className={OTHER_CHIP} pressed={showDayOther} onPressedChange={setShowDayOther}>
              <Plus /> Other
            </Toggle>
          </div>
          {showDayOther && (
            <Input
              autoFocus
              aria-label="What else was different yesterday"
              placeholder="e.g. late shift, travelled"
              maxLength={200}
              value={dayOther}
              onChange={(e) => setDayOther(e.target.value)}
              className={INPUT}
            />
          )}
        </Extra>

        <Extra icon={Stethoscope} tone="provider" title="For your provider" hint="Your provider sees this before your visit.">
          {notes.length > 0 && (
            <ul className="space-y-2">
              {notes.map((n, i) => (
                <li key={i} className="flex items-start gap-2 rounded-2xl bg-surface-2 py-1 pr-1 pl-3">
                  <Textarea
                    aria-label={`Note ${i + 1}`}
                    rows={1}
                    value={n.text}
                    maxLength={200}
                    onChange={(e) => setNotes((all) => all.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                    className="field-sizing-content min-h-10 flex-1 resize-none border-0 bg-transparent px-0 py-2 text-[15px] leading-snug shadow-none focus-visible:ring-0 dark:bg-transparent"
                  />
                  {n.fromStory && <span className="mt-2.5 hidden text-xs text-muted-foreground sm:inline">from your story</span>}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="mt-1.5"
                    aria-label="Remove this note"
                    onClick={() => setNotes((all) => all.filter((_, j) => j !== i))}
                  >
                    <X />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <div className={cn("flex items-center gap-2", notes.length > 0 && "mt-3")}>
            {notesSpeech.supported && (
              <button
                type="button"
                onClick={notesSpeech.toggle}
                aria-label={notesSpeech.listening ? "Stop recording" : "Say a note"}
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
                  notesSpeech.listening ? "animate-pulse bg-[#ff8a7a] text-white" : "bg-brand text-brand-foreground",
                )}
              >
                {notesSpeech.listening ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
              </button>
            )}
            <Input
              aria-label="Add a note for your provider"
              placeholder="e.g. headache, new medicine…"
              maxLength={200}
              value={notesSpeech.interim ? `${noteDraft} ${notesSpeech.interim}` : noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addNote();
                }
              }}
              className="h-11 flex-1 rounded-2xl border-0 bg-surface-2 text-base focus-visible:ring-2 focus-visible:ring-brand dark:bg-surface-2"
            />
            <Button size="icon-lg" variant="outline" className="size-11 rounded-full" aria-label="Add note" disabled={!noteDraft.trim()} onClick={addNote}>
              <Plus />
            </Button>
          </div>
        </Extra>
        </section>

        <div className="sticky bottom-0 -mx-6 mt-auto bg-gradient-to-t from-background from-70% to-transparent px-6 pt-6 pb-4">
          <Button variant="brand" size="xl" disabled={!complete || otherMissing || saving} onClick={save}>
            {saving ? <Loader2 className="animate-spin" /> : <Check />}
            {otherMissing ? "Add the medication name" : "Save"}
          </Button>
        </div>
      </PatientShell>
    );
  }

  if (step === "done" && result && parsed.success) {
    const d = parsed.data;
    const st = result.dayStreak;
    const tags = [
      ...medicinesTaken.map((m) => ({ icon: Pill, tone: "pill" as const, text: m })),
      ...habits.map((h) => ({ icon: Coffee, tone: "day" as const, text: HABITS.find((x) => x.key === h)!.short })),
      ...(showDayOther && dayOther.trim() ? [{ icon: Coffee, tone: "day" as const, text: dayOther.trim() }] : []),
      ...notes.map((n) => ({ icon: Stethoscope, tone: "provider" as const, text: n.text })),
    ];
    return (
      <PatientShell>
        <MoonMark className="mt-6 size-12" />
        <h1 className="mt-5 font-display text-[36px] leading-[1.08]">Saved. Thanks, {firstName}.</h1>

        <div className="mt-6 space-y-3">
          {result.watchTstMin != null && result.mismatch && !watchAnswered && (
            <SoftCard className="ring-brand/60">
              <p className="flex items-center gap-2 font-semibold">
                <Watch className="size-5 text-brand" /> Your watch saw it differently
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                Watch: {formatDuration(result.watchTstMin)}. You: {formatDuration(result.diaryTstMin)}. Your answer counts.
                What happened?
              </p>
              <div className="mt-4 grid gap-2">
                {(
                  [
                    ["lying_awake", "I was lying awake but still"],
                    ["took_off", "I took the watch off"],
                    ["not_sure", "Not sure"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className="h-12 justify-start rounded-2xl text-[15px]"
                    onClick={async () => {
                      await answerWatch(result.nightId, key);
                      setWatchAnswered(true);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </SoftCard>
          )}

          <StreakCard streak={st} week={result.week} />
          <NightCard d={d} tags={tags} onEdit={() => setStep("review")} />
          <SleepWeek recent={result.recent} prevWeekTstMin={result.prevWeekTstMin} />
        </div>

        <div className="mt-auto pt-8">
          <Button asChild variant="ghost" size="xl">
            <Link href="/patient">Back to home</Link>
          </Button>
        </div>
      </PatientShell>
    );
  }

  return null;
}

// ================= Pieces =================

/** Tap-to-answer options for each diary question; clock options sit around the patient's usual times. */
function quickPicks(k: DiaryFieldKey, usual: UsualTimes): { label: string; value: string | number }[] {
  const around = (hhmm: string) =>
    [-60, 0, 60, 120].map((d) => {
      const clock = formatClock(parseClock(hhmm) + d);
      return { label: formatClock12(clock), value: clock };
    });
  switch (k) {
    case "inBed":
      return around(usual.inBed);
    case "finalWake":
      return around(usual.finalWake);
    case "solMin":
      return [
        { label: "Quickly", value: 10 },
        { label: "~30 min", value: 30 },
        { label: "~1 hour", value: 60 },
        { label: "Longer", value: 90 },
      ];
    case "awakenings":
      return [
        { label: "None", value: 0 },
        { label: "Once", value: 1 },
        { label: "Twice", value: 2 },
        { label: "3+", value: 3 },
      ];
    case "wasoMin":
      return [
        { label: "Not at all", value: 0 },
        { label: "A bit", value: 20 },
        { label: "~45 min", value: 45 },
        { label: "Longer", value: 90 },
      ];
    default:
      return [];
  }
}

function TopLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="self-start font-semibold text-primary underline underline-offset-4">
      {label}
    </Link>
  );
}

function formatValue(k: DiaryFieldKey, v: FieldValue, approx: boolean | undefined): string {
  const kind = FIELD_META[k].kind;
  if (kind === "clock") return formatClock12(String(v));
  if (kind === "quality") return `${QUALITY_LABELS[Number(v) - 1]} (${v} of 5)`;
  if (kind === "count") return `${v} time${Number(v) === 1 ? "" : "s"}`;
  return `${approx ? "about " : ""}${formatDuration(Number(v))}`;
}

type Speech = ReturnType<typeof useSpeech>;

/** The "Listening…" screen from the reference design (CHK-02). */
function VoiceScreen({
  speech,
  story,
  setStory,
  loading,
  onFinish,
  onType,
}: {
  speech: Speech;
  story: string;
  setStory: (s: string) => void;
  loading: boolean;
  onFinish: () => void;
  onType: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [checked, setChecked] = useState(false);
  const { supported, listening, start } = speech;

  // Start listening right away; the tap on the home screen was the user's gesture.
  useEffect(() => {
    if (supported) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  useEffect(() => {
    if (!listening) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [listening]);

  // Browsers without speech recognition (e.g. Firefox) go straight to typing.
  useEffect(() => {
    const t = setTimeout(() => setChecked(true), 400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (checked && !supported) onType();
  }, [checked, supported, onType]);

  const text = speech.interim ? `${story} ${speech.interim}`.trim() : story;

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-49px)] w-full max-w-md flex-col px-6 pt-8 pb-10">
      <div className="flex items-center justify-between">
        <Link href="/patient" className="font-semibold text-primary underline underline-offset-4" onClick={speech.stop}>
          Cancel
        </Link>
        {listening && (
          <span className="flex items-center gap-2 text-[15px] text-muted-foreground tabular-nums">
            <span className="size-2.5 animate-pulse rounded-full bg-[#ff8a7a]" />
            {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <h1 className="mt-8 font-display text-[40px] leading-[1.1]">
        {loading ? "Reading your story…" : listening ? "Listening…" : story ? "Got it" : "Tap to start"}
      </h1>
      {loading && <p className="mt-2 text-[17px] text-muted-foreground">Turning your words into your sleep diary.</p>}

      <div className="mt-8 mb-6 flex h-10 items-center justify-center gap-[6px]" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-full w-[6px] rounded-full",
              i % 3 === 0 ? "bg-brand" : "bg-muted-foreground/50",
              listening ? "ss-bar" : "scale-y-[0.35]",
            )}
            style={listening ? { animationDelay: `${(i * 73) % 900}ms` } : undefined}
          />
        ))}
      </div>

      <StoryHints className="mb-4" />
      <Label htmlFor="voice-story" className="sr-only">
        What you said
      </Label>
      <Textarea
        id="voice-story"
        readOnly={listening}
        value={text}
        onChange={(e) => setStory(e.target.value)}
        placeholder="Your words will appear here as you talk."
        className="min-h-56 flex-1 resize-none rounded-3xl border-0 bg-card p-6 text-xl leading-relaxed ring-1 ring-border/60 placeholder:text-muted-foreground/70 focus-visible:border-0 focus-visible:ring-2 focus-visible:ring-brand dark:bg-card"
      />

      <div className="mt-8 flex flex-col items-center gap-3">
        {loading ? (
          <Loader2 className="size-10 animate-spin text-brand" />
        ) : listening ? (
          <button
            type="button"
            onClick={onFinish}
            aria-label="Finish"
            className="flex size-20 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform active:scale-95"
          >
            <Square className="size-6 fill-current" />
          </button>
        ) : story.trim() ? (
          <Button variant="brand" size="xl" onClick={onFinish}>
            Continue
          </Button>
        ) : (
          <button
            type="button"
            onClick={start}
            aria-label="Start talking"
            className="flex size-20 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform active:scale-95"
          >
            <Mic className="size-8" />
          </button>
        )}
        {!loading && !story.trim() && !listening && <p className="text-[15px] text-muted-foreground">Tap to talk</p>}
        {!loading && listening && <p className="text-[15px] text-muted-foreground">Tap to finish</p>}
        <button
          type="button"
          className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4"
          onClick={onType}
        >
          <Keyboard className="size-4" /> Type instead
        </button>
        <p className="text-center text-xs text-muted-foreground/80">
          Voice uses your browser&apos;s speech service (in Chrome, that&apos;s Google).{" "}
          <Link href="/patient/privacy" className="underline">
            Learn more
          </Link>
        </p>
      </div>
    </main>
  );
}

/** What to cover, each with a short example answer (the test story's night). Deliberately general, so it fits any night. */
const STORY_HINTS = [
  { icon: BedDouble, tone: "bed", label: "Bedtime", example: "12:30" },
  { icon: Hourglass, tone: "asleep", label: "Fell asleep", example: "in ~1 hour" },
  { icon: MoonStar, tone: "night", label: "At night", example: "woke 2 times" },
  { icon: Sunrise, tone: "wake", label: "Wake up", example: "8:15" },
  { icon: Pill, tone: "pill", label: "Pills", example: "melatonin" },
  { icon: Coffee, tone: "day", label: "Your day", example: "coffee, stress" },
] satisfies { icon: LucideIcon; tone: Tone; label: string; example: string }[];

function StoryHints({ className }: { className?: string }) {
  return (
    <ul className={cn("grid grid-cols-3 gap-2", className)} aria-label="Things to mention, with examples">
      {STORY_HINTS.map(({ icon, tone, label, example }) => (
        <li key={label} className="rounded-2xl bg-card px-3 py-3 ring-1 ring-border/60">
          <IconBadge icon={icon} tone={tone} />
          <p className="mt-2 text-[13px] leading-tight font-semibold">{label}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{example}</p>
        </li>
      ))}
    </ul>
  );
}

/** "What did the AI do?" (AI-06): input, output, limits, where it runs. */
function AiPanel({ extraction }: { extraction: ExtractionResult }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <Bot /> What did the AI do?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal">What the AI did</DialogTitle>
          <DialogDescription>
            {extraction.mode === "ai"
              ? `Read by a self-hosted AI model in ${(extraction.ms / 1000).toFixed(1)} s.`
              : "The AI model wasn't available, so a simple rule-based method was used."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            <span className="font-semibold">Input:</span> only the words you said or typed about last night.
          </p>
          <p>
            <span className="font-semibold">Output:</span> the 8 standard sleep diary answers (Consensus Sleep Diary),
            plus habits you mentioned.
          </p>
          <p>
            <span className="font-semibold">Limits:</span> it can misread things. Answers with a yellow dot, or marked
            &ldquo;assumed&rdquo;, are ones it was unsure about. You have the last word on every answer.
          </p>
          <p>
            <span className="font-semibold">Never:</span> it doesn&apos;t calculate your sleep numbers, give a sleep
            score, or diagnose anything. Your provider&apos;s summary is calculated by tested code from the answers
            you confirm.
          </p>
          <p>
            <span className="font-semibold">Where it runs:</span> on a self-hosted model. The text of your story is not
            sent to OpenAI or Google. Voice typing is different: in Chrome, the browser uses Google to turn speech into
            text. See{" "}
            <Link href="/patient/privacy" className="underline">
              Privacy
            </Link>
            .
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One part of the "Anything else?" card. */
function Extra({
  icon,
  tone,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-5">
      <h2 className={cn("flex items-center gap-2 font-semibold", hint ? "mb-0.5" : "mb-3")}>
        <IconBadge icon={icon} tone={tone} />
        {title}
      </h2>
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

/** Streak (CHK-18): big number and this week's flames. */
function StreakCard({ streak, week }: { streak: DayStreak; week: Saved["week"] }) {
  return (
    <SoftCard>
      <div className="flex items-center gap-4">
        <span className="flex size-16 items-center justify-center rounded-full bg-brand text-brand-foreground">
          <Flame className="size-9" strokeWidth={2.2} aria-hidden="true" />
        </span>
        <p className="flex flex-col">
          <span className="font-display text-5xl leading-none tabular-nums">{streak.days}</span>
          <span className="mt-1 text-sm font-semibold text-muted-foreground">day streak</span>
        </p>
      </div>
      <MorningDots week={week} className="mt-5" />
    </SoftCard>
  );
}

/** Last night as a picture: a bed-to-wake timeline, three key numbers, and tags for the extras. */
function NightCard({ d, tags, onEdit }: { d: DiaryEntry; tags: { icon: LucideIcon; tone: Tone; text: string }[]; onEdit: () => void }) {
  const Face = d.quality ? QUALITY_FACES[d.quality - 1] : null;
  const stats = [
    { icon: Hourglass, tone: "asleep" as Tone, value: d.solMin == null ? "?" : formatDuration(d.solMin), label: "to fall asleep" },
    { icon: MoonStar, tone: "night" as Tone, value: d.awakenings == null ? "?" : `${d.awakenings}×`, label: "woke up" },
    ...(Face ? [{ icon: Face, tone: "mood" as Tone, value: QUALITY_LABELS[d.quality - 1], label: "sleep" }] : []),
  ];
  return (
    <SoftCard>
      <div className="flex items-center justify-between">
        <p className="font-semibold">Last night</p>
        <Button variant="outline" size="sm" className="rounded-full" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
      </div>
      <NightTimeline d={d} />
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {stats.map(({ icon: Icon, tone, value, label }) => (
          <li key={label} className="flex flex-col items-center rounded-2xl bg-surface-2 px-1 py-3 text-center">
            <IconBadge icon={Icon} tone={tone} className="size-9 rounded-xl [&>svg]:size-5" />
            <span className="mt-1 font-semibold tabular-nums">{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
          </li>
        ))}
      </ul>
      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {tags.map(({ icon: Icon, tone, text }, i) => (
            <li key={i} className="flex max-w-full items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-sm">
              <IconBadge icon={Icon} tone={tone} className="size-5 rounded-full [&>svg]:size-3" />
              <span className="truncate">{text}</span>
            </li>
          ))}
        </ul>
      )}
    </SoftCard>
  );
}

/**
 * Bed to wake as one bar: falling asleep and time awake in the night (brand), sleep (chart-1).
 * Wakings are spread evenly, since the diary doesn't say when they happened.
 */
function NightTimeline({ d }: { d: DiaryEntry }) {
  if (!d.inBed || !d.finalWake) return null;
  const span = nightMinutes(d.finalWake) - nightMinutes(d.inBed);
  if (span <= 0) return null;
  const sol = Math.min(d.solMin ?? 0, span);
  const wakes = d.awakenings ?? 0;
  const waso = Math.min(d.wasoMin ?? 0, span - sol);
  const sleepPiece = (span - sol - waso) / (wakes + 1);
  const segs: { awake: boolean; min: number }[] = [];
  if (sol > 0) segs.push({ awake: true, min: sol });
  for (let i = 0; i <= wakes; i++) {
    segs.push({ awake: false, min: sleepPiece });
    if (i < wakes && waso > 0) segs.push({ awake: true, min: waso / wakes });
  }
  return (
    <figure className="mt-4">
      <div
        className="flex h-9 gap-[2px] overflow-hidden rounded-[6px]"
        role="img"
        aria-label={`In bed ${formatClock12(d.inBed)} to ${formatClock12(d.finalWake)}`}
      >
        {segs.map((g, i) => (
          <div
            key={i}
            className={cn("h-full min-w-[3px]", g.awake ? "bg-brand" : "bg-chart-1")}
            style={{ flexGrow: g.min, flexBasis: 0 }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs font-semibold tabular-nums">
        <span>{formatClock12(d.inBed)}</span>
        <span>{formatClock12(d.finalWake)}</span>
      </div>
      <figcaption className="mt-1 flex justify-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-chart-1" /> Asleep
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px] bg-brand" /> Awake
        </span>
      </figcaption>
    </figure>
  );
}

const WEEKDAY = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Total sleep for the last 7 nights, with the trend against the week before. */
function SleepWeek({ recent, prevWeekTstMin }: { recent: { date: string; tstMin: number | null }[]; prevWeekTstMin: number | null }) {
  const known = recent.map((r) => r.tstMin).filter((v): v is number => v != null);
  if (known.length === 0) return null;
  const sorted = [...known].sort((a, b) => a - b);
  const med = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const diff = prevWeekTstMin == null ? null : Math.round(med - prevWeekTstMin);
  const max = 600; // 10 h
  return (
    <SoftCard>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold">This week</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          ~{formatDuration(med)} a night
          {diff != null && Math.abs(diff) >= 10 && (
            <span
              className={cn("ml-1.5 font-semibold", diff > 0 ? "text-good" : "text-foreground")}
              title={`${formatDuration(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than last week`}
            >
              {diff > 0 ? "▲" : "▼"} {formatDuration(Math.abs(diff))}
            </span>
          )}
        </p>
      </div>
      <div className="mt-4 flex h-28 items-end gap-2" role="img" aria-label="Hours of sleep, last 7 nights">
        {recent.map((r, i) => {
          const last = i === recent.length - 1;
          const morning = new Date(`${r.date}T00:00:00Z`);
          morning.setUTCDate(morning.getUTCDate() + 1);
          return (
            <div key={r.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={r.tstMin == null ? "Not known" : formatDuration(r.tstMin)}>
              {last && (
                <span className="text-[11px] font-semibold whitespace-nowrap tabular-nums">
                  {r.tstMin == null ? "?" : formatDuration(r.tstMin)}
                </span>
              )}
              {r.tstMin == null ? (
                <div className="h-6 w-full rounded-t-[4px] border-2 border-b-0 border-dashed border-muted-foreground/40" />
              ) : (
                <div
                  className={cn("w-full rounded-t-[4px]", last ? "bg-chart-1" : "bg-chart-1/45")}
                  style={{ height: `${(Math.min(r.tstMin, max) / max) * 100}%` }}
                />
              )}
              <span className={cn("text-xs text-muted-foreground", last && "font-bold text-foreground")}>
                {WEEKDAY[morning.getUTCDay()]}
              </span>
            </div>
          );
        })}
      </div>
    </SoftCard>
  );
}
