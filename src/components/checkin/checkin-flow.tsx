"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Bot, CalendarDays, Check, HelpCircle, Keyboard, Loader2, Mic, Pencil, Plus, Square, Stethoscope, Watch, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MoonMark, PatientShell, SoftCard, WeekDots } from "@/components/brand";
import { answerWatch, logClientEvent, saveCheckin, type CheckinResult } from "@/app/actions";
import type { ExtractionResult } from "@/adapters/llm/types";
import { fillRoughNight, followUpQuestion, type UsualTimes } from "@/core/checkin";
import { detectHabits } from "@/core/habit-detect";
import { MEDICINE_SAFETY_LINE } from "@/core/medications";
import { consistencyIssues } from "@/core/metrics";
import {
  DiaryEntrySchema,
  FIELD_META,
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
import { formatClock12, formatDateLong, formatDuration } from "@/core/time";
import { cn } from "@/lib/utils";
import { FieldInput, type FieldValue } from "./field-input";
import { useSpeech } from "./use-speech";

type Step = "voice" | "type" | "quick" | "review" | "followup" | "habits" | "done";
type Values = Partial<Record<DiaryFieldKey, FieldValue>>;
type Saved = Extract<CheckinResult, { ok: true }>;

const CHIP = "h-11 rounded-full! border-2! px-4 text-[15px] font-semibold";

export function CheckinFlow({
  initialMode,
  medicines,
  usual,
  usualDayText,
  firstName,
  visitDate,
}: {
  initialMode: "voice" | "type" | "quick";
  usual: UsualTimes;
  usualDayText: string | null;
  firstName: string;
  visitDate: string;
  /** The patient's own sleep medicines, from registration (MED-01). */
  medicines: { name: string; kind: SleepAid; planText: string | null }[];
}) {
  const [step, setStep] = useState<Step>(initialMode);
  const [story, setStory] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [values, setValues] = useState<Values>({});
  const [assumed, setAssumed] = useState<Set<DiaryFieldKey>>(new Set());
  const [mode, setMode] = useState<"full" | "rough">("full");
  const [wokeReasons, setWokeReasons] = useState<WokeReason[]>([]);
  const [wakeNote, setWakeNote] = useState("");
  const [habits, setHabits] = useState<HabitKey[]>([]);
  const [fromStory, setFromStory] = useState<HabitKey[]>([]);
  // HAB-09: free text or voice for anything the chips don't cover.
  const [dayNote, setDayNote] = useState("");
  const [fromNote, setFromNote] = useState<HabitKey[]>([]);
  const [dismissed, setDismissed] = useState<HabitKey[]>([]);
  const [tookAid, setTookAid] = useState(false);
  // MED-02: which of her medicines she took, plus anything new she names.
  const [meds, setMeds] = useState<string[]>([]);
  const [otherMed, setOtherMed] = useState("");
  const [showOther, setShowOther] = useState(false);
  /** Ticks the patient's own medicine of this kind, if she has one; otherwise asks for the name. */
  function preselectAid(kind: SleepAid) {
    setTookAid(true);
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
  const noteSpeech = useSpeech((text) => changeNote(dayNote ? `${dayNote} ${text}` : text));
  const wakeSpeech = useSpeech((text) => setWakeNote((s) => (s ? `${s} ${text}` : text)));
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
      setNotes(r.notes.map((n) => ({ text: n.fact, fromStory: true })));
      setHabits(r.habits);
      setFromStory(r.habits);
      if (r.sleepAid) preselectAid(r.sleepAid);
      setMode("full");
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
    FIELD_ORDER.map((k) => [k, unknown.has(k) ? null : values[k] === "" ? undefined : values[k]]),
  );
  const parsed = DiaryEntrySchema.safeParse(entryValues);
  const complete = parsed.success;
  const issues = complete ? consistencyIssues(parsed.data) : [];
  const missing = FIELD_ORDER.filter((k) => !unknown.has(k) && (values[k] === undefined || values[k] === ""));

  const corrected = useMemo(() => {
    if (!extraction) return 0;
    return FIELD_ORDER.filter((k) => extraction.fields[k] && extraction.fields[k]!.value !== values[k]).length;
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
  }

  function chooseAmbiguity(value: string | number) {
    if (!extraction?.ambiguity) return;
    // A clock time means it was when they woke, so the awake duration stays for the patient to fill in.
    if (typeof value === "number") setField(extraction.ambiguity.field, value);
    setExtraction({ ...extraction, ambiguity: null });
  }

  const followUp = complete ? followUpQuestion(parsed.data) : null;

  // ---- Quick check-in (rough-night mode, CHK-10) ----
  const [quick, setQuick] = useState<{ quality?: number; solMin?: number; wasoMin?: number }>({});
  const quickLeft = [quick.quality, quick.solMin, quick.wasoMin].filter((x) => x == null).length;
  function finishQuick() {
    const { fields, assumed: a } = fillRoughNight(quick as Required<typeof quick>, usual);
    setValues(fields);
    setAssumed(new Set(a));
    setMode("rough");
    setExtraction(null);
    setStep("habits");
  }

  // ---- Habits and day note ----
  function changeNote(next: string) {
    setDayNote(next);
    const found = detectHabits(next);
    setFromNote(found.habits);
    const add = found.habits.filter((h) => !dismissed.includes(h));
    if (add.length) setHabits((prev) => [...new Set([...prev, ...add])]);
    if (found.sleepAid && !tookAid) preselectAid(found.sleepAid);
  }

  function changeHabits(next: HabitKey[]) {
    const removed = habits.filter((h) => !next.includes(h));
    if (removed.length) setDismissed((d) => [...new Set([...d, ...removed])]);
    setHabits(next);
  }

  const somethingDifferent = habits.length > 0 || tookAid || dayNote.trim().length > 0;

  // ---- Save ----
  function save(normalDay = false) {
    const fields = DiaryEntrySchema.parse(entryValues) as DiaryEntry;
    startSaving(async () => {
      const r = await saveCheckin({
        fields,
        mode,
        habits: normalDay ? [] : habits,
        medicines: !normalDay && tookAid ? [...meds, ...(showOther ? [otherMed.trim()] : [])].filter(Boolean) : [],
        wokeReasons,
        wakeNote: wakeNote.trim() || null,
        story: story.trim() || null,
        dayNote: dayNote.trim() || null,
        providerNotes: notes.map((n) => n.text.trim()).filter(Boolean),
        quote: extraction?.quote ?? null,
        aiMode: extraction ? extraction.mode : "manual",
        aiFieldsCorrected: corrected,
        durationMs: Date.now() - startedAt.current,
      });
      if (!r.ok) {
        toast.error(r.errors.join(" "));
        setStep(mode === "rough" ? "quick" : "review");
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
        <p className="mt-3 text-[17px] leading-relaxed text-muted-foreground">Any words are fine.</p>
        <StoryHints className="mt-5" />
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
            onClick={() => setStep("quick")}
          >
            Rough night? Answer in 3 taps
          </button>
        </div>
      </PatientShell>
    );
  }

  if (step === "quick") {
    return (
      <PatientShell>
        <TopLink href="/patient" label="Back" />
        <h1 className="mt-8 font-display text-[36px] leading-[1.1]">Quick check-in</h1>
        <p className="mt-2 text-[17px] text-muted-foreground">
          Three taps. Times come from your usual schedule, and you can change them later.
        </p>
        <div className="mt-8 space-y-7">
          <Segmented
            label="How did you sleep?"
            options={[1, 2, 3, 4, 5].map((q) => ({ value: q, label: ["Awful", "Poor", "Okay", "Good", "Great"][q - 1] }))}
            value={quick.quality}
            onChange={(v) => setQuick((x) => ({ ...x, quality: v }))}
          />
          <Segmented
            label="How long to fall asleep?"
            options={[
              { value: 10, label: "Quickly" },
              { value: 30, label: "~30 min" },
              { value: 60, label: "~1 hour" },
              { value: 90, label: "Longer" },
            ]}
            value={quick.solMin}
            onChange={(v) => setQuick((x) => ({ ...x, solMin: v }))}
          />
          <Segmented
            label="How long were you awake in the night?"
            options={[
              { value: 0, label: "Not at all" },
              { value: 20, label: "A bit" },
              { value: 45, label: "~45 min" },
              { value: 90, label: "Longer" },
            ]}
            value={quick.wasoMin}
            onChange={(v) => setQuick((x) => ({ ...x, wasoMin: v }))}
          />
        </div>
        <div className="mt-auto pt-10">
          {quickLeft > 0 ? (
            <Button variant="outline" size="xl" disabled className="border-2 opacity-100">
              {quickLeft} question{quickLeft === 1 ? "" : "s"} left
            </Button>
          ) : (
            <Button variant="brand" size="xl" onClick={finishQuick}>
              Continue
            </Button>
          )}
        </div>
      </PatientShell>
    );
  }

  if (step === "review" && extraction) {
    return (
      <PatientShell>
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="font-semibold text-primary underline underline-offset-4"
            onClick={() => setStep(initialMode === "voice" && speech.supported ? "voice" : "type")}
          >
            {initialMode === "voice" ? "Record again" : "Edit my words"}
          </button>
          <AiPanel extraction={extraction} />
        </div>
        <h1 className="mt-6 font-display text-[36px] leading-[1.1]">Here&apos;s what I heard</h1>
        <p className="mt-2 flex items-center gap-2 text-[17px] text-muted-foreground">
          <Pencil className="size-4 shrink-0" /> Tap any answer to change it.
        </p>

        {extraction.mode === "fallback" && (
          <p className="mt-4 rounded-2xl bg-warn px-4 py-3 text-sm text-warn-foreground">
            The AI wasn&apos;t available{extraction.fallbackReason === "timeout" ? " in time" : ""}, so a simpler method
            read your story. Please check each line.
          </p>
        )}

        {extraction.ambiguity && (
          <div className="mt-4 rounded-3xl bg-brand-soft p-4 ring-1 ring-brand/50">
            <p className="flex items-start gap-2 font-semibold">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand" /> {extraction.ambiguity.question}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {extraction.ambiguity.options.map((o) => (
                <Button key={o.label} variant="outline" className="rounded-full" onClick={() => chooseAmbiguity(o.value)}>
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        <ul className="mt-5 divide-y divide-border/70 rounded-3xl bg-card px-3 ring-1 ring-border/60">
          {FIELD_ORDER.filter((k) => k !== "quality").map((k) => {
            const f = extraction.fields[k];
            const v = values[k];
            const isUnknown = unknown.has(k);
            const isMissing = !isUnknown && (v === undefined || v === "");
            const unchanged = f && f.value === v;
            const check = !isMissing && unchanged && f.confidence !== "high" && !assumed.has(k);
            const approx = unchanged && f.confidence === "medium";
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => setEditing(k)}
                  aria-label={`Change: ${FIELD_META[k].label}`}
                  className="group my-1 flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none active:bg-surface-2"
                >
                  <span className="text-[15px] text-muted-foreground">{FIELD_META[k].label}</span>
                  <span className="ml-auto flex flex-col items-end">
                    {isUnknown ? (
                      <span className="flex items-center gap-1.5 font-semibold whitespace-nowrap text-muted-foreground">
                        <HelpCircle className="size-4" /> Don&apos;t know
                      </span>
                    ) : isMissing ? (
                      <span className="font-semibold text-warn-foreground">Tap to add</span>
                    ) : (
                      <span className="flex items-center gap-2 text-right font-semibold">
                        {check && <span className="size-2 rounded-full bg-brand" aria-label="Please check" />}
                        {formatValue(k, v!, approx)}
                      </span>
                    )}
                    {!isMissing && !isUnknown && assumed.has(k) && <span className="text-xs text-muted-foreground">assumed</span>}
                  </span>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                    <Pencil className="size-3.5" />
                  </span>
                </button>
              </li>
            );
          })}
          <li className="px-2 py-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[15px] text-muted-foreground">Sleep quality</span>
              {extraction.fields.quality &&
                extraction.fields.quality.value === values.quality &&
                extraction.fields.quality.confidence !== "high" && (
                  <span className="size-2 rounded-full bg-brand" aria-label="Please check" />
                )}
              {values.quality == null && <span className="text-xs font-semibold text-warn-foreground">Please pick one</span>}
            </div>
            <FieldInput name="quality" value={values.quality} onChange={(v) => setField("quality", v)} />
          </li>
        </ul>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-brand" /> Please check
          </span>
          <span>assumed = not said, worked out from your other answers</span>
          <span>Not sure about something? Tap it and choose &ldquo;I don&apos;t know&rdquo;.</span>
        </p>

        <section className="mt-6 rounded-3xl bg-card p-5 ring-1 ring-border/60" aria-labelledby="provider-notes">
          <h2 id="provider-notes" className="flex items-center gap-2 font-semibold">
            <Stethoscope className="size-5 text-primary" /> Worth telling your provider
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {notes.some((n) => n.fromStory)
              ? "I picked these out of your story. Edit or remove anything, or add your own."
              : "Anything your provider should know: a symptom, a new medicine, something on your mind."}
          </p>
          {notes.length > 0 && (
            <ul className="mt-3 space-y-2">
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
                  {n.fromStory && <span className="hidden text-xs text-muted-foreground sm:inline">from your story</span>}
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
          <div className="mt-3 flex items-center gap-2">
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
              placeholder="Add a note…"
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

        <div className="mt-auto pt-8">
          <Button
            variant="brand"
            size="xl"
            disabled={!complete || issues.length > 0}
            onClick={() => setStep(followUp ? "followup" : "habits")}
          >
            {missing.length ? `Answer ${missing.length} more to continue` : "Yes, that’s right"}
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

  if (step === "followup" && parsed.success) {
    const woke = followUp === "woke_reason";
    const times = parsed.data.awakenings ?? 0;
    return (
      <PatientShell>
        <div className="flex items-center justify-between">
          <button type="button" className="font-semibold text-primary underline underline-offset-4" onClick={() => setStep("review")}>
            Back
          </button>
          <button
            type="button"
            className="font-semibold text-primary underline underline-offset-4"
            onClick={() => {
              setWokeReasons([]);
              setWakeNote("");
              setStep("habits");
            }}
          >
            Skip
          </button>
        </div>
        <p className="mt-8 text-[17px] text-muted-foreground">
          {woke
            ? `You woke up ${times === 1 ? "once" : times === 2 ? "twice" : `${times} times`} last night.`
            : "It took a while to fall asleep."}
        </p>
        <h1 className="mt-1.5 font-display text-[36px] leading-[1.1]">{woke ? "What woke you up?" : "What kept you awake?"}</h1>
        <p className="mt-2 text-[17px] text-muted-foreground">Pick any that fit.</p>
        <ToggleGroup
          type="multiple"
          variant="outline"
          className="mt-6 flex w-full flex-wrap justify-start gap-2.5"
          value={wokeReasons}
          onValueChange={(v) => setWokeReasons(v as WokeReason[])}
        >
          {WOKE_REASONS.map((r) => (
            <ToggleGroupItem key={r.key} value={r.key} className={CHIP}>
              {r.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <OwnWords
          className="mt-6"
          label="Or tell me in your own words"
          value={wakeNote}
          onChange={setWakeNote}
          speech={wakeSpeech}
          placeholder="e.g. my roommate came home late"
        />
        <div className="mt-auto pt-8">
          <Button variant="brand" size="xl" onClick={() => setStep("habits")}>
            Next
          </Button>
        </div>
      </PatientShell>
    );
  }

  if (step === "habits") {
    return (
      <PatientShell>
        <button
          type="button"
          className="self-start font-semibold text-primary underline underline-offset-4"
          onClick={() => setStep(mode === "rough" ? "quick" : followUp ? "followup" : "review")}
        >
          Back
        </button>
        <h1 className="mt-8 font-display text-[36px] leading-[1.1]">Was yesterday different from usual?</h1>
        {usualDayText && (
          <p className="mt-5 rounded-2xl bg-card px-4 py-3 text-[15px] leading-relaxed text-muted-foreground ring-1 ring-border/60">
            Your usual day: {usualDayText}
          </p>
        )}
        <Button
          variant={somethingDifferent ? "outline" : "brand"}
          size="xl"
          className="mt-5"
          disabled={saving}
          onClick={() => save(true)}
        >
          No, it was a normal day
        </Button>

        <p className="mt-7 text-[15px] text-muted-foreground">Or pick what was different</p>
        <ToggleGroup
          type="multiple"
          variant="outline"
          className="mt-3 flex w-full flex-wrap justify-start gap-2.5"
          value={habits}
          onValueChange={(v) => changeHabits(v as HabitKey[])}
        >
          {HABITS.map((h) => (
            <ToggleGroupItem key={h.key} value={h.key} className={CHIP}>
              {h.short}
              {habits.includes(h.key) && (fromStory.includes(h.key) || fromNote.includes(h.key)) && (
                <span className="text-xs font-normal opacity-80">· from your {fromStory.includes(h.key) ? "story" : "note"}</span>
              )}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <Toggle
            variant="outline"
            className={CHIP}
            pressed={tookAid}
            onPressedChange={(on) => {
              setTookAid(on);
              if (!on) {
                setMeds([]);
                setShowOther(false);
                setOtherMed("");
              }
            }}
          >
            Took a sleep aid
          </Toggle>
        </div>
        {tookAid && (
          <div className="mt-3 rounded-2xl bg-card p-4 ring-1 ring-border/60">
            <p className="text-sm text-muted-foreground">Which one?</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {medicines.length > 0 && (
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  className="flex flex-wrap justify-start gap-2"
                  value={meds}
                  onValueChange={(v) => setMeds(v)}
                >
                  {medicines.map((m) => (
                    <ToggleGroupItem
                      key={m.name}
                      value={m.name}
                      title={m.planText ? `Your plan: ${m.planText}` : undefined}
                      className="h-10 rounded-full! border-2! px-4 text-sm font-semibold"
                    >
                      {m.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              <Toggle
                variant="outline"
                className="h-10 rounded-full! border-2! px-4 text-sm font-semibold"
                pressed={showOther}
                onPressedChange={(on) => {
                  setShowOther(on);
                  if (!on) setOtherMed("");
                }}
              >
                <Plus /> Something else
              </Toggle>
            </div>
            {showOther && (
              <Input
                autoFocus
                aria-label="Name of the medicine"
                placeholder="Name of the medicine, e.g. Nytol"
                maxLength={60}
                value={otherMed}
                onChange={(e) => setOtherMed(e.target.value)}
                className="mt-3 h-11 rounded-2xl border-0 bg-surface-2 text-base focus-visible:ring-2 focus-visible:ring-brand dark:bg-surface-2"
              />
            )}
            <p className="mt-3 text-xs text-muted-foreground">{MEDICINE_SAFETY_LINE}</p>
          </div>
        )}

        <OwnWords
          className="mt-6"
          label="Anything else different, or something new?"
          hint="Optional, e.g. new medication, travelled, late shift, or what stayed the same."
          value={dayNote}
          onChange={changeNote}
          speech={noteSpeech}
          placeholder="Tell me in your own words"
        />
        {fromNote.some((h) => habits.includes(h)) && (
          <p className="mt-2 px-1 text-xs text-muted-foreground">
            I ticked what I recognised in your note. Untick anything that&apos;s wrong.
          </p>
        )}

        {somethingDifferent && (
          <div className="sticky bottom-0 -mx-6 mt-6 bg-gradient-to-t from-background from-70% to-transparent px-6 pt-6 pb-4">
            <Button variant="brand" size="xl" disabled={saving || (tookAid && meds.length === 0 && !(showOther && otherMed.trim()))} onClick={() => save()}>
              {saving ? <Loader2 className="animate-spin" /> : <Check />} Save
            </Button>
          </div>
        )}
      </PatientShell>
    );
  }

  if (step === "done" && result) {
    return (
      <PatientShell>
        <MoonMark className="mt-8 size-16" />
        <h1 className="mt-8 font-display text-[40px] leading-[1.08]">Saved. Thanks, {firstName}.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground">
          One rough night doesn&apos;t define your sleep. Your provider will see the pattern over weeks, not single
          nights.
        </p>

        <div className="mt-8 space-y-3">
          {result.watchTstMin != null && result.mismatch && !watchAnswered && (
            <SoftCard className="ring-brand/60">
              <p className="flex items-center gap-2 font-semibold">
                <Watch className="size-5 text-brand" /> Your watch saw it differently
              </p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
                Your watch counted {formatDuration(result.watchTstMin)} of sleep; you said{" "}
                {formatDuration(result.diaryTstMin)}. Your answer is what counts. What do you think happened?
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
          {watchAnswered && (
            <p className="px-1 text-sm text-muted-foreground">Thanks, that&apos;s noted for your provider.</p>
          )}

          <WeekDots week={result.week} />

          <SoftCard className="flex gap-3">
            <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-[15px] leading-relaxed">
              Visit with your primary care provider on <strong>{formatDateLong(visitDate)}</strong>. Your Sleep
              Snapshot has <strong>{result.snapshotNights} nights</strong> so far.
            </p>
          </SoftCard>
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
      <p className="mt-2 text-[17px] text-muted-foreground">
        {loading ? "Turning your words into your sleep diary." : "Talk naturally. You can stop any time."}
      </p>

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

/** A gentle reminder of what to cover. Deliberately general, so it fits any night. */
const STORY_HINTS = ["When you went to bed", "How long to fall asleep", "Waking up in the night", "When you got up", "How you feel"];

function StoryHints({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm text-muted-foreground">You could mention:</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Things you could mention">
        {STORY_HINTS.map((h) => (
          <li key={h} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm text-foreground/85 ring-1 ring-border/60">
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Text box with a mic button, for "in your own words" answers. */
function OwnWords({
  label,
  hint,
  value,
  onChange,
  speech,
  placeholder,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  speech: Speech;
  placeholder: string;
  className?: string;
}) {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className={cn("rounded-3xl bg-card p-4 ring-1 ring-border/60", className)}>
      <Label htmlFor={id} className="text-[15px] font-semibold">
        {label}
      </Label>
      {hint && <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3 flex items-start gap-3">
        {speech.supported && (
          <button
            type="button"
            onClick={speech.toggle}
            aria-label={speech.listening ? "Stop recording" : "Say it instead"}
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
              speech.listening ? "animate-pulse bg-[#ff8a7a] text-white" : "bg-brand text-brand-foreground",
            )}
          >
            {speech.listening ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
          </button>
        )}
        <Textarea
          id={id}
          rows={2}
          maxLength={500}
          value={speech.interim ? `${value} ${speech.interim}` : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-2xl border-0 bg-surface-2 text-base focus-visible:ring-2 focus-visible:ring-brand dark:bg-surface-2"
        />
      </div>
      {speech.supported && (
        <p className="mt-2 text-xs text-muted-foreground/80">Voice uses your browser&apos;s speech service (in Chrome, Google).</p>
      )}
    </div>
  );
}

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: number; label: string }[];
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-[17px] font-semibold">{label}</legend>
      <ToggleGroup
        type="single"
        variant="outline"
        className="grid w-full gap-2"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        value={value != null ? String(value) : ""}
        onValueChange={(v) => v && onChange(Number(v))}
      >
        {options.map((o) => (
          <ToggleGroupItem
            key={o.value}
            value={String(o.value)}
            className="h-14 rounded-2xl! border-2! bg-card px-1 text-[15px] font-semibold whitespace-normal"
          >
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </fieldset>
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
