"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyQuote } from "@/adapters/llm/validate";
import { simulatedWatch } from "@/adapters/wearables";
import { forgivingStreak, weekMornings } from "@/core/checkin";
import { consistencyIssues, isWatchMismatch, nightMetrics } from "@/core/metrics";
import { DiaryFieldsSchema, HABIT_KEYS, NightSchema, SLEEP_AID_KEYS, WOKE_REASON_KEYS } from "@/core/schema";
import { addDays } from "@/core/time";
import { prisma } from "@/db/client";
import { nightToRow } from "@/db/mappers";
import { mainPatient, requireSession } from "@/db/queries";
import { createSession, endSession, logEvent, nextMorning, resetSession } from "@/db/session";

// ---- Start screen and tester bar (DEMO-01, DEMO-04 to DEMO-07) ----

export async function startAsMaya() {
  await createSession("maya");
  redirect("/patient");
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
  fields: DiaryFieldsSchema,
  mode: z.enum(["full", "rough"]),
  habits: z.array(z.enum(HABIT_KEYS)),
  sleepAid: z.enum(SLEEP_AID_KEYS).nullable(),
  wokeReasons: z.array(z.enum(WOKE_REASON_KEYS)),
  wakeNote: z.string().trim().max(500).nullable(),
  story: z.string().max(2000).nullable(),
  quote: z.string().max(300).nullable(),
  dayNote: z.string().trim().max(500).nullable(),
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
      diaryTstMin: number;
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
    sleepAid: d.sleepAid,
    wokeReasons: d.wokeReasons,
    wakeNote: d.wakeNote || null,
    note: d.story,
    quote: d.story ? verifyQuote(d.quote, d.story) : null, // AI-04, checked again on the server
    dayNote: d.dayNote || null,
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
