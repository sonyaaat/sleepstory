"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Info, Loader2, Mic, MicOff, Moon, Watch } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { answerWatch, logClientEvent, saveCheckin, type CheckinResult } from "@/app/actions";
import type { ExtractionResult } from "@/adapters/llm/types";
import { fillRoughNight, followUpQuestion, type UsualTimes } from "@/core/checkin";
import { consistencyIssues } from "@/core/metrics";
import {
  DiaryFieldsSchema,
  FIELD_META,
  FIELD_ORDER,
  HABITS,
  QUALITY_LABELS,
  SLEEP_AIDS,
  WOKE_REASONS,
  type DiaryFieldKey,
  type DiaryFields,
  type HabitKey,
  type SleepAid,
  type WokeReason,
} from "@/core/schema";
import { formatDuration } from "@/core/time";
import { FieldInput, type FieldValue } from "./field-input";
import { useSpeech } from "./use-speech";
import { detectHabits } from "@/core/habit-detect";
import { Toggle } from "@/components/ui/toggle";

type Step = "story" | "rough" | "review" | "followup" | "habits" | "done";
type Values = Partial<Record<DiaryFieldKey, FieldValue>>;

const STEP_PROGRESS: Record<Step, number> = { story: 15, rough: 30, review: 45, followup: 65, habits: 85, done: 100 };

export function CheckinFlow({ usual, usualDayText }: { usual: UsualTimes; usualDayText: string | null }) {
  const [step, setStep] = useState<Step>("story");
  const [story, setStory] = useState("");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [values, setValues] = useState<Values>({});
  const [assumed, setAssumed] = useState<Set<DiaryFieldKey>>(new Set());
  const [mode, setMode] = useState<"full" | "rough">("full");
  const [wokeReason, setWokeReason] = useState<WokeReason | null>(null);
  const [habits, setHabits] = useState<HabitKey[]>([]);
  const [fromStory, setFromStory] = useState<HabitKey[]>([]);
  // HAB-09: free text or voice for anything the chips don't cover.
  const [dayNote, setDayNote] = useState("");
  const [fromNote, setFromNote] = useState<HabitKey[]>([]);
  const [dismissed, setDismissed] = useState<HabitKey[]>([]);
  const [tookAid, setTookAid] = useState(false);
  const [sleepAid, setSleepAid] = useState<SleepAid | null>(null);
  const [result, setResult] = useState<Extract<CheckinResult, { ok: true }> | null>(null);
  const [watchAnswered, setWatchAnswered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, startSaving] = useTransition();
  const startedAt = useRef(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    logClientEvent("checkin_started", {}).catch(() => {});
  }, []);

  const speech = useSpeech((text) => setStory((s) => (s ? `${s} ${text}` : text)));
  const noteSpeech = useSpeech((text) => changeNote(dayNote ? `${dayNote} ${text}` : text));

  /** Updates the day note and ticks the chips it mentions, unless the patient unticked them before. */
  function changeNote(next: string) {
    setDayNote(next);
    const found = detectHabits(next);
    setFromNote(found.habits);
    const add = found.habits.filter((h) => !dismissed.includes(h));
    if (add.length) setHabits((prev) => [...new Set([...prev, ...add])]);
    if (found.sleepAid && !tookAid) {
      setTookAid(true);
      setSleepAid(found.sleepAid);
    }
  }

  function changeHabits(next: HabitKey[]) {
    const removed = habits.filter((h) => !next.includes(h));
    if (removed.length) setDismissed((d) => [...new Set([...d, ...removed])]);
    setHabits(next);
  }

  // ---- Step 1: story -> extraction ----
  async function readStory() {
    setLoading(true);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story }),
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
      setHabits(r.habits);
      setFromStory(r.habits);
      if (r.sleepAid) {
        setTookAid(true);
        setSleepAid(r.sleepAid);
      }
      setMode("full");
      setStep("review");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  // ---- Review helpers ----
  const parsed = DiaryFieldsSchema.safeParse(values);
  const complete = parsed.success;
  const issues = complete ? consistencyIssues(parsed.data) : [];
  const missing = FIELD_ORDER.filter((k) => values[k] === undefined || values[k] === "");

  const corrected = useMemo(() => {
    if (!extraction) return 0;
    return FIELD_ORDER.filter((k) => extraction.fields[k] && extraction.fields[k]!.value !== values[k]).length;
  }, [extraction, values]);

  function setField(k: DiaryFieldKey, v: FieldValue) {
    setValues((prev) => ({ ...prev, [k]: v }));
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

  function afterReview() {
    setStep(followUpQuestion(parsed.data!) ? "followup" : "habits");
  }

  // ---- Rough night ----
  const [rough, setRough] = useState<{ solMin?: number; wasoMin?: number; quality?: number }>({});
  function finishRough() {
    const { fields, assumed: a } = fillRoughNight(rough as Required<typeof rough>, usual);
    setValues(fields);
    setAssumed(new Set(a));
    setMode("rough");
    setExtraction(null);
    setStep("habits");
  }

  // ---- Save ----
  function save(normalDay = false) {
    const fields = DiaryFieldsSchema.parse(values) as DiaryFields;
    startSaving(async () => {
      const r = await saveCheckin({
        fields,
        mode,
        habits: normalDay ? [] : habits,
        sleepAid: !normalDay && tookAid ? sleepAid : null,
        wokeReason,
        story: story.trim() || null,
        dayNote: dayNote.trim() || null,
        quote: extraction?.quote ?? null,
        aiMode: extraction ? extraction.mode : "manual",
        aiFieldsCorrected: corrected,
        durationMs: Date.now() - startedAt.current,
      });
      if (!r.ok) {
        toast.error(r.errors.join(" "));
        setStep(mode === "rough" ? "rough" : "review");
        return;
      }
      setResult(r);
      setStep("done");
    });
  }

  const followUp = complete ? followUpQuestion(parsed.data) : null;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to home">
          <Link href="/patient">
            <ArrowLeft />
          </Link>
        </Button>
        <Progress value={STEP_PROGRESS[step]} className="flex-1" aria-label="Check-in progress" />
      </div>

      {step === "story" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Tell us about last night</CardTitle>
            <CardDescription>
              When you went to bed, how long it took to fall asleep, if you woke up, when you got up. Any words are
              fine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="story" className="sr-only">
              Your night
            </Label>
            <Textarea
              id="story"
              rows={6}
              className="text-base"
              placeholder="e.g. Went to bed around 12:30, took about an hour to fall asleep, woke up twice…"
              value={speech.interim ? `${story} ${speech.interim}` : story}
              onChange={(e) => setStory(e.target.value)}
            />
            {speech.supported && (
              <Button variant={speech.listening ? "destructive" : "outline"} className="w-full" onClick={speech.toggle}>
                {speech.listening ? <MicOff /> : <Mic />} {speech.listening ? "Stop recording" : "Speak instead"}
              </Button>
            )}
            {speech.supported && <VoiceNote />}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button size="lg" className="h-12 w-full text-base" disabled={!story.trim() || loading} onClick={readStory}>
              {loading ? (
                <>
                  <Loader2 className="animate-spin" /> Reading your story…
                </>
              ) : (
                "Continue"
              )}
            </Button>
            <Button variant="link" onClick={() => setStep("rough")}>
              <Moon /> Rough night? Just 3 questions
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "rough" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Just the basics</CardTitle>
            <CardDescription>Sorry it was a rough night. Three quick taps and you&apos;re done.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ChipQuestion
              label="How long did it take to fall asleep?"
              options={[15, 30, 60, 90, 120]}
              format={(m) => (m === 120 ? "2 h+" : formatDuration(m))}
              value={rough.solMin}
              onChange={(v) => setRough((r) => ({ ...r, solMin: v }))}
            />
            <ChipQuestion
              label="How long were you awake during the night?"
              options={[0, 15, 30, 60, 120]}
              format={(m) => (m === 0 ? "None" : m === 120 ? "2 h+" : formatDuration(m))}
              value={rough.wasoMin}
              onChange={(v) => setRough((r) => ({ ...r, wasoMin: v }))}
            />
            <ChipQuestion
              label="How would you rate your sleep?"
              options={[1, 2, 3, 4, 5]}
              format={(q) => QUALITY_LABELS[q - 1]}
              value={rough.quality}
              onChange={(v) => setRough((r) => ({ ...r, quality: v }))}
            />
            <p className="text-xs text-muted-foreground">
              Bed and wake times will come from your usual times. You can change them later.
            </p>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              size="lg"
              className="h-12 w-full"
              disabled={rough.solMin == null || rough.wasoMin == null || rough.quality == null}
              onClick={finishRough}
            >
              Continue
            </Button>
            <Button variant="link" onClick={() => setStep("story")}>
              Tell the full story instead
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "review" && extraction && (
        <>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-semibold">Is this right?</h1>
            <AiPanel extraction={extraction} />
          </div>
          {extraction.mode === "fallback" && (
            <Alert>
              <Info />
              <AlertTitle>Filled in by the simple parser</AlertTitle>
              <AlertDescription>
                The AI model wasn&apos;t available{extraction.fallbackReason === "timeout" ? " in time" : ""}, so a
                simpler method read your story. Please check every field.
              </AlertDescription>
            </Alert>
          )}
          {extraction.ambiguity && (
            <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="text-amber-600" />
              <AlertTitle>{extraction.ambiguity.question}</AlertTitle>
              <AlertDescription className="mt-2 flex flex-wrap gap-2">
                {extraction.ambiguity.options.map((o) => (
                  <Button key={o.label} size="sm" variant="outline" onClick={() => chooseAmbiguity(o.value)}>
                    {o.label}
                  </Button>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardContent className="divide-y">
              {FIELD_ORDER.map((k) => {
                const f = extraction.fields[k];
                const isMissing = values[k] === undefined || values[k] === "";
                const check = !isMissing && f && extraction.fields[k]!.value === values[k] && (f.confidence !== "high" || assumed.has(k));
                return (
                  <div
                    key={k}
                    className={`flex flex-col gap-2 py-3 ${isMissing ? "-mx-2 rounded-md bg-destructive/5 px-2" : check ? "-mx-2 rounded-md bg-amber-50 px-2 dark:bg-amber-950/20" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`field-${k}`} className="text-sm font-medium">
                        {FIELD_META[k].label}
                      </Label>
                      {isMissing && <Badge variant="destructive">Please fill in</Badge>}
                      {!isMissing && assumed.has(k) && <Badge variant="outline">Assumed</Badge>}
                      {!isMissing && check && !assumed.has(k) && (
                        <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-400">
                          Please check
                        </Badge>
                      )}
                    </div>
                    <FieldInput name={k} value={values[k]} onChange={(v) => setField(k, v)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          {issues.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle />
              <AlertTitle>Something doesn&apos;t add up</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4">
                  {issues.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Button size="lg" className="h-12 w-full text-base" disabled={!complete || issues.length > 0} onClick={afterReview}>
            {missing.length ? `Fill in ${missing.length} more` : "Looks right"}
          </Button>
        </>
      )}

      {step === "followup" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              {followUp === "woke_reason" ? "What woke you up?" : "What kept you awake?"}
            </CardTitle>
            <CardDescription>Optional. Pick the closest one.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup
              type="single"
              variant="outline"
              className="grid w-full grid-cols-2 gap-2"
              value={wokeReason ?? ""}
              onValueChange={(v) => setWokeReason((v || null) as WokeReason | null)}
            >
              {WOKE_REASONS.map((r) => (
                <ToggleGroupItem key={r.key} value={r.key} className="h-12 rounded-md! border! text-sm">
                  {r.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button size="lg" className="h-12 w-full" onClick={() => setStep("habits")}>
              {wokeReason ? "Continue" : "Skip"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "habits" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Was yesterday different from usual?</CardTitle>
            {usualDayText && <CardDescription>Your usual day: {usualDayText}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              variant="outline"
              className="h-12 w-full text-base"
              disabled={saving}
              onClick={() => save(true)}
            >
              <CheckCircle2 /> No, a normal day
            </Button>
            <Separator />
            <p className="text-sm text-muted-foreground">Or tap what was different:</p>
            <ToggleGroup
              type="multiple"
              variant="outline"
              className="flex w-full flex-wrap justify-start gap-2"
              value={habits}
              onValueChange={(v) => changeHabits(v as HabitKey[])}
            >
              {HABITS.map((h) => (
                <ToggleGroupItem key={h.key} value={h.key} className="h-10 rounded-full! border! px-3 text-sm">
                  {h.short}
                  {habits.includes(h.key) && (fromStory.includes(h.key) || fromNote.includes(h.key)) && (
                    <span className="text-[10px] opacity-70">
                      · from your {fromStory.includes(h.key) ? "story" : "note"}
                    </span>
                  )}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <div className="space-y-2">
              <Toggle
                variant="outline"
                className="h-10 rounded-full! px-3 text-sm"
                pressed={tookAid}
                onPressedChange={(on) => {
                  setTookAid(on);
                  if (!on) setSleepAid(null);
                }}
              >
                Took a sleep aid
              </Toggle>
              {tookAid && (
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="flex flex-wrap justify-start gap-2"
                  value={sleepAid ?? ""}
                  onValueChange={(v) => setSleepAid((v || null) as SleepAid | null)}
                >
                  {SLEEP_AIDS.map((a) => (
                    <ToggleGroupItem key={a.key} value={a.key} className="h-9 rounded-full! border! px-3 text-sm">
                      {a.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="day-note" className="text-sm">
                Anything else different, or something new?{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="day-note"
                rows={2}
                maxLength={500}
                className="text-base"
                placeholder="e.g. new medication, felt sick, travelled, late shift at work, or what stayed the same"
                value={noteSpeech.interim ? `${dayNote} ${noteSpeech.interim}` : dayNote}
                onChange={(e) => changeNote(e.target.value)}
              />
              {noteSpeech.supported && (
                <Button
                  size="sm"
                  variant={noteSpeech.listening ? "destructive" : "outline"}
                  onClick={noteSpeech.toggle}
                >
                  {noteSpeech.listening ? <MicOff /> : <Mic />} {noteSpeech.listening ? "Stop recording" : "Say it instead"}
                </Button>
              )}
              {noteSpeech.supported && <VoiceNote />}
              {fromNote.some((h) => habits.includes(h)) && (
                <p className="text-xs text-muted-foreground">
                  We ticked what we recognised in your note. Untick anything that&apos;s wrong. Your note is shared
                  with your provider in your own words.
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              size="lg"
              className="h-12 w-full text-base"
              disabled={saving || (habits.length === 0 && !tookAid && !dayNote.trim()) || (tookAid && !sleepAid)}
              onClick={() => save()}
            >
              {saving ? <Loader2 className="animate-spin" /> : null} Save
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === "done" && result && (
        <>
          <Card className="border-primary/30 bg-primary/5 text-center">
            <CardHeader>
              <CheckCircle2 className="mx-auto size-10 text-primary" />
              <CardTitle className="text-xl">Thanks, that&apos;s saved</CardTitle>
              <CardDescription>
                Every entry gives your provider a clearer picture of how you&apos;ve really been sleeping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {result.streak.logged} of the last {result.streak.window} days logged
              </p>
            </CardContent>
          </Card>

          {result.watchTstMin != null && result.mismatch && !watchAnswered && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Watch className="size-4" /> Your watch saw it differently
                </CardTitle>
                <CardDescription>
                  Your watch says you slept {formatDuration(result.watchTstMin)}; your diary says{" "}
                  {formatDuration(result.diaryTstMin)}. Your answer counts, not the watch. What do you think happened?
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
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
                    className="h-11 justify-start"
                    onClick={async () => {
                      await answerWatch(result.nightId, key);
                      setWatchAnswered(true);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}
          {result.watchTstMin != null && !result.mismatch && (
            <p className="text-center text-sm text-muted-foreground">
              <Watch className="mr-1 inline size-4" /> Your watch and your diary roughly agree.
            </p>
          )}
          {watchAnswered && <p className="text-center text-sm text-muted-foreground">Thanks, noted for your provider.</p>}

          <Button asChild size="lg" className="h-12 w-full">
            <Link href="/patient">Back to home</Link>
          </Button>
        </>
      )}
    </main>
  );
}

/** Honest note under each mic button (PRIV-09): browser speech recognition isn't ours. */
function VoiceNote() {
  return (
    <p className="text-xs text-muted-foreground">
      Voice uses your browser&apos;s speech service (in Chrome, that&apos;s Google). Prefer privacy? Type instead.{" "}
      <Link href="/patient/privacy" className="underline">
        Learn more
      </Link>
    </p>
  );
}

function ChipQuestion({
  label,
  options,
  format,
  value,
  onChange,
}: {
  label: string;
  options: number[];
  format: (n: number) => string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <ToggleGroup
        type="single"
        variant="outline"
        className="flex flex-wrap justify-start gap-2"
        value={value != null ? String(value) : ""}
        onValueChange={(v) => v && onChange(Number(v))}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o} value={String(o)} className="h-10 rounded-full! border! px-3 text-sm">
            {format(o)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** "What did the AI do?" (AI-06): input, output, limits, where it runs. */
function AiPanel({ extraction }: { extraction: ExtractionResult }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Bot /> What did the AI do?
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What the AI did</DialogTitle>
          <DialogDescription>
            {extraction.mode === "ai"
              ? `Read by a self-hosted AI model in ${(extraction.ms / 1000).toFixed(1)} s.`
              : "The AI model wasn't available, so a simple rule-based parser was used."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            <span className="font-medium">Input:</span> only the words you wrote or said about last night.
          </p>
          <p>
            <span className="font-medium">Output:</span> the 8 standard sleep diary answers (from the Consensus Sleep
            Diary), plus habits you mentioned.
          </p>
          <p>
            <span className="font-medium">Limits:</span> it can misread things. Fields marked{" "}
            <Badge variant="outline">Please check</Badge> or <Badge variant="outline">Assumed</Badge> are ones it was
            unsure about. You have the last word on every answer.
          </p>
          <p>
            <span className="font-medium">What it never does:</span> calculate your sleep numbers, give a sleep score,
            or diagnose anything. Your provider&apos;s summary is calculated by tested code from the answers you
            confirm.
          </p>
          <p>
            <span className="font-medium">Where it runs:</span> on a self-hosted model. The text of your story is not
            sent to OpenAI or Google. (Voice typing is different: in Chrome, the browser uses Google to turn speech
            into text. See{" "}
            <Link href="/patient/privacy" className="underline">
              Privacy
            </Link>
            .)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
