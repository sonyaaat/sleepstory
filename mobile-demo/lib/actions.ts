// Browser version of src/app/actions.ts for the phone demo: the same functions, inputs and results,
// saving to the phone's copy of the data instead of the database. Keep it in step with the real file.

import { z } from "zod";
import { verifyQuote } from "@/adapters/llm/validate";
import { simulatedWatch } from "@/adapters/wearables";
import { dayStreak, forgivingStreak, weekMornings, type DayStreak } from "@/core/checkin";
import { consistencyIssues, isWatchMismatch, median, nightMetrics } from "@/core/metrics";
import { DiaryEntrySchema, HABIT_KEYS, NightSchema, WOKE_REASON_KEYS } from "@/core/schema";
import { OnboardingSchema, type OnboardingInput } from "@/core/onboarding";
import { addDays, formatClock, parseClock } from "@/core/time";
import type { UsualDay } from "@/db/demo-data";
import { navigate } from "./navigation";
import { mainPatient, requireSession } from "./queries";
import { createSession, currentSession, endSession, logEvent, resetSession } from "./session";
import { getState, setState, type StoredPatient } from "./store";

function updatePatient(id: string, change: (p: StoredPatient) => StoredPatient) {
  const s = getState();
  setState({ ...s, patients: s.patients.map((p) => (p.id === id ? change(p) : p)) });
}

const nightIdOf = (patientId: string, date: string) => `${patientId}:${date}`;

// ---- Start screen and tester bar (DEMO-01, DEMO-04 to DEMO-07) ----

/** Start screen: "Try it as Maya, from sign-up" goes through onboarding first; otherwise straight to Maya's morning. */
export async function startAsMaya(formData: FormData) {
  await createSession("maya");
  navigate(formData.get("next") === "onboarding" ? "/patient/onboarding" : "/patient");
}

// ---- Onboarding (ONB-01 to ONB-05): Maya's answers are pre-filled; edits really change her data ----

export async function saveOnboarding(input: OnboardingInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const s = await requireSession();
  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Some answers are missing." };
  const d = parsed.data;
  const main = await mainPatient(s.id);
  if (!main) return { ok: false, error: "No patient in this demo session." };

  const offset = (t: string, min: number) => formatClock(parseClock(t) + min);
  const usualDay: UsualDay = {
    ...(main.patient.usualDay ?? { sleepAids: "" }),
    inBed: d.usual.inBed,
    lightsOut: offset(d.usual.inBed, 15),
    finalWake: offset(d.usual.outOfBed, -15),
    outOfBed: d.usual.outOfBed,
    caffeine: d.usual.caffeine,
    alcohol: d.usual.alcohol,
    exercise: d.usual.exercise,
    otherHabits: d.usual.other,
    reminderTime: d.reminderTime,
  };
  updatePatient(main.patient.id, (p) => ({
    ...p,
    consentAt: new Date().toISOString(),
    visitDate: d.visitDate,
    watchConnected: d.watchConnected,
    usualDay,
    medications: d.medications,
    isiBaseline: d.isi,
    screening: d.screening,
  }));
  await logEvent(s.id, "onboarding_done", { durationMs: d.durationMs, screensChanged: d.changed });
  return { ok: true };
}

export async function testerReset() {
  const s = await requireSession();
  await resetSession(s.id);
  navigate("/patient");
}

export async function testerNewTester() {
  await endSession();
  navigate("/");
}

// ---- Check-in (CHK-03 to CHK-10) ----

const CheckinSchema = z.object({
  fields: DiaryEntrySchema, // null = "I don't know" (CHK-16)
  mode: z.enum(["full", "rough"]),
  habits: z.array(z.enum(HABIT_KEYS)),
  medicines: z.array(z.string().trim().min(1).max(60)).max(5), // names, from the patient's list or new (MED-02)
  wokeReasons: z.array(z.enum(WOKE_REASON_KEYS)),
  wakeNote: z.string().trim().max(500).nullable(),
  story: z.string().max(2000).nullable(),
  quote: z.string().max(300).nullable(),
  dayNote: z.string().trim().max(500).nullable(),
  providerNotes: z.array(z.string().trim().min(1).max(200)).max(8), // CHK-15
  aiMode: z.enum(["ai", "fallback", "manual"]),
  aiFieldsCorrected: z.number().int().min(0).max(8),
  durationMs: z.number().int().min(0),
});
export type CheckinInput = z.infer<typeof CheckinSchema>;

export type CheckinResult =
  | { ok: false; errors: string[] }
  | {
      ok: true;
      nightId: string;
      diaryTstMin: number | null;
      watchTstMin: number | null;
      mismatch: boolean;
      streak: { logged: number; window: number };
      dayStreak: DayStreak;
      week: ReturnType<typeof weekMornings>;
      /** The last 7 nights, oldest first, for the small chart on the Saved screen. */
      recent: { date: string; tstMin: number | null }[];
      /** Median total sleep of the 7 nights before those, to show the trend. */
      prevWeekTstMin: number | null;
      snapshotNights: number;
    };

export async function saveCheckin(input: CheckinInput): Promise<CheckinResult> {
  const s = await requireSession();
  const parsed = CheckinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: ["Some answers are missing or out of range."] };
  const d = parsed.data;
  const issues = consistencyIssues(d.fields);
  if (issues.length) return { ok: false, errors: issues };

  const main = await mainPatient(s.id);
  if (!main) return { ok: false, errors: ["No patient in this demo session."] };

  const date = addDays(s.today, -1); // last night, dated by its evening
  const watchTstMin = main.patient.watchConnected ? await simulatedWatch.totalSleepFor(date, d.fields) : null;
  const night = NightSchema.parse({
    ...d.fields,
    date,
    mode: d.mode,
    habits: d.habits,
    medicines: d.medicines,
    // The type comes from the patient's own list; a new medicine has no known type yet.
    sleepAid:
      d.medicines
        .map((name) => main.patient.medications.find((m) => m.name.toLowerCase() === name.toLowerCase())?.kind)
        .find(Boolean) ?? null,
    wokeReasons: d.wokeReasons,
    wakeNote: d.wakeNote || null,
    note: d.story,
    quote: d.story ? verifyQuote(d.quote, d.story) : null, // AI-04, checked again on save
    dayNote: d.dayNote || null,
    providerNotes: d.providerNotes,
    watchTstMin,
  });
  // One entry per night: saving again replaces it (CHK-12).
  updatePatient(main.patient.id, (p) => ({ ...p, nights: [...p.nights.filter((n) => n.date !== date), night] }));

  await logEvent(s.id, "checkin_saved", {
    date,
    mode: d.mode,
    aiMode: d.aiMode,
    aiFieldsCorrected: d.aiFieldsCorrected,
    durationMs: d.durationMs,
    hasDayNote: Boolean(d.dayNote),
    providerNotes: d.providerNotes.length,
    unknownAnswers: Object.values(d.fields).filter((v) => v === null).length,
  });

  const dates = [...main.nights.map((n) => n.date), date];
  const all = [...main.nights.filter((n) => n.date !== date), night];
  const tstOn = (day: string) => {
    const n = all.find((x) => x.date === day);
    return n ? nightMetrics(n).tstMin : null;
  };
  const prev = Array.from({ length: 7 }, (_, i) => tstOn(addDays(date, -13 + i))).filter((v): v is number => v != null);
  return {
    ok: true,
    nightId: nightIdOf(main.patient.id, date),
    diaryTstMin: nightMetrics(night).tstMin,
    watchTstMin,
    mismatch: isWatchMismatch(night),
    streak: forgivingStreak(dates, s.today),
    dayStreak: dayStreak(dates, s.today),
    week: weekMornings(dates, s.today),
    recent: Array.from({ length: 7 }, (_, i) => {
      const day = addDays(date, i - 6);
      return { date: day, tstMin: tstOn(day) };
    }),
    prevWeekTstMin: median(prev),
    snapshotNights: new Set(dates.filter((x) => x >= addDays(s.today, -56))).size,
  };
}

export async function answerWatch(nightId: string, answer: "lying_awake" | "took_off" | "not_sure") {
  const s = await requireSession();
  const main = await mainPatient(s.id);
  if (!main) return;
  updatePatient(main.patient.id, (p) => ({
    ...p,
    nights: p.nights.map((n) => (nightIdOf(p.id, n.date) === nightId ? { ...n, watchAnswer: answer } : n)),
  }));
  await logEvent(s.id, "watch_answer", { answer });
}

// ---- Session log (DEMO-11) ----

export async function logClientEvent(type: "checkin_started" | "snapshot_viewed", data: Record<string, unknown>) {
  // Never changes page: it also runs as a page closes (e.g. after "New tester").
  const s = await currentSession();
  if (s) await logEvent(s.id, type, data);
}
