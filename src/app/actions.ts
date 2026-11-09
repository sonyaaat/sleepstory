"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyQuote } from "@/adapters/llm/validate";
import { simulatedWatch } from "@/adapters/wearables";
import { forgivingStreak, weekMornings } from "@/core/checkin";
import { consistencyIssues, isWatchMismatch, nightMetrics } from "@/core/metrics";
import { DiaryEntrySchema, HABIT_KEYS, NightSchema, WOKE_REASON_KEYS } from "@/core/schema";
import { OnboardingSchema, type OnboardingInput } from "@/core/onboarding";
import { addDays, formatClock, parseClock } from "@/core/time";
import { prisma } from "@/db/client";
import { nightToRow } from "@/db/mappers";
import { mainPatient, requireSession } from "@/db/queries";
import type { UsualDay } from "@/db/demo-data";
import { createSession, endSession, logEvent, nextMorning, resetSession } from "@/db/session";

// ---- Start screen and tester bar (DEMO-01, DEMO-04 to DEMO-07) ----

/** Start screen: "See how sign-up works" goes through onboarding first; otherwise straight to Maya's morning. */
export async function startAsMaya(formData: FormData) {
  await createSession("maya");
  redirect(formData.get("next") === "onboarding" ? "/patient/onboarding" : "/patient");
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
    reminderTime: d.reminderTime,
  };
  await prisma.patient.update({
    where: { id: main.patient.id },
    data: {
      consentAt: new Date(),
      visitDate: d.visitDate,
      watchConnected: d.watchConnected,
      usualDay: JSON.stringify(usualDay),
      medications: JSON.stringify(d.medications),
      isiBaseline: JSON.stringify(d.isi),
      screening: JSON.stringify(d.screening),
    },
  });
  await logEvent(s.id, "onboarding_done", { durationMs: d.durationMs, screensChanged: d.changed });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function testerNextMorning() {
  const s = await requireSession();
  await nextMorning(s.id);
  revalidatePath("/", "layout");
}

export async function testerReset() {
  const s = await requireSession();
  await resetSession(s.id);
  revalidatePath("/", "layout");
  redirect("/patient");
}

export async function testerNewTester() {
  await endSession();
  redirect("/");
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
      week: ReturnType<typeof weekMornings>;
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
    quote: d.story ? verifyQuote(d.quote, d.story) : null, // AI-04, checked again on the server
    dayNote: d.dayNote || null,
    providerNotes: d.providerNotes,
    watchTstMin,
  });
  const row = { ...nightToRow(night), aiFieldsCorrected: d.aiFieldsCorrected, source: d.aiMode };
  const saved = await prisma.night.upsert({
    where: { patientId_date: { patientId: main.patient.id, date } },
    create: { ...row, patientId: main.patient.id },
    update: row,
  });

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
  revalidatePath("/", "layout");

  const dates = [...main.nights.map((n) => n.date), date];
  return {
    ok: true,
    nightId: saved.id,
    diaryTstMin: nightMetrics(night).tstMin,
    watchTstMin,
    mismatch: isWatchMismatch(night),
    streak: forgivingStreak(dates, s.today),
    week: weekMornings(dates, s.today),
    snapshotNights: new Set(dates.filter((d) => d >= addDays(s.today, -56))).size,
  };
}

export async function answerWatch(nightId: string, answer: "lying_awake" | "took_off" | "not_sure") {
  const s = await requireSession();
  const main = await mainPatient(s.id);
  if (!main) return;
  await prisma.night.updateMany({ where: { id: nightId, patientId: main.patient.id }, data: { watchAnswer: answer } });
  await logEvent(s.id, "watch_answer", { answer });
  revalidatePath("/", "layout");
}

// ---- Session log (DEMO-11) ----

export async function logClientEvent(type: "checkin_started" | "snapshot_viewed", data: Record<string, unknown>) {
  const s = await requireSession();
  await logEvent(s.id, type, data);
}
