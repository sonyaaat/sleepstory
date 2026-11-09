import { z } from "zod";
import { isClock } from "./time";

// One definition of the data, shared by the AI layer, the API and the UI.
// Field names follow the Consensus Sleep Diary (CSD).

const clock = z.string().refine(isClock, "Expected HH:MM (24h)");

export const HABITS = [
  { key: "caffeine_late", label: "Caffeine or energy drink after 2 pm", short: "Late caffeine" },
  { key: "alcohol", label: "Alcohol", short: "Alcohol" },
  { key: "stress", label: "Stressful day / deadline", short: "Stressful day" },
  { key: "late_study", label: "Studied late", short: "Studied late" },
  { key: "screens_bed", label: "Screens in bed", short: "Screens in bed" },
  { key: "nap", label: "Napped", short: "Napped" },
  { key: "exercise", label: "Exercised", short: "Exercised" },
  { key: "unwell", label: "Felt unwell", short: "Felt unwell" },
] as const;

export type HabitKey = (typeof HABITS)[number]["key"];
export const HABIT_KEYS = HABITS.map((h) => h.key) as [HabitKey, ...HabitKey[]];

export const SLEEP_AIDS = [
  { key: "melatonin", label: "Melatonin" },
  { key: "otc", label: "Over-the-counter" },
  { key: "prescription", label: "Prescription" },
] as const;
export type SleepAid = (typeof SLEEP_AIDS)[number]["key"];
export const SLEEP_AID_KEYS = SLEEP_AIDS.map((a) => a.key) as [SleepAid, ...SleepAid[]];

export const WOKE_REASONS = [
  { key: "worry", label: "Racing thoughts" },
  { key: "bathroom", label: "Bathroom" },
  { key: "noise", label: "Noise" },
  { key: "roommate", label: "Roommate or partner" },
  { key: "phone", label: "Phone" },
  { key: "pain", label: "Pain" },
  { key: "hot_cold", label: "Too hot or cold" },
  { key: "not_sure", label: "Not sure" },
] as const;
export type WokeReason = (typeof WOKE_REASONS)[number]["key"];
export const WOKE_REASON_KEYS = WOKE_REASONS.map((r) => r.key) as [WokeReason, ...WokeReason[]];

/** The diary fields the patient confirms every morning. */
export const DiaryFieldsSchema = z.object({
  inBed: clock, // CSD Q1: what time did you get into bed?
  lightsOut: clock, // CSD Q2: what time did you try to go to sleep?
  solMin: z.number().int().min(0).max(600), // CSD Q3: how long to fall asleep (min)
  awakenings: z.number().int().min(0).max(30), // CSD Q4: how many times did you wake up
  wasoMin: z.number().int().min(0).max(720), // CSD Q5: total time awake during the night
  finalWake: clock, // CSD Q6: time of final awakening
  outOfBed: clock, // CSD Q7: time you got out of bed
  quality: z.number().int().min(1).max(5), // CSD Q8: sleep quality 1 (very poor) - 5 (very good)
});
export type DiaryFields = z.infer<typeof DiaryFieldsSchema>;
export type DiaryFieldKey = keyof DiaryFields;

/**
 * What the patient actually saves. Any answer except sleep quality can be "I don't know"
 * (null): an honest gap is better than a guess. Metrics skip what they can't compute.
 */
export const DiaryEntrySchema = DiaryFieldsSchema.extend({
  inBed: clock.nullable(),
  lightsOut: clock.nullable(),
  solMin: DiaryFieldsSchema.shape.solMin.nullable(),
  awakenings: DiaryFieldsSchema.shape.awakenings.nullable(),
  wasoMin: DiaryFieldsSchema.shape.wasoMin.nullable(),
  finalWake: clock.nullable(),
  outOfBed: clock.nullable(),
});
export type DiaryEntry = z.infer<typeof DiaryEntrySchema>;
export const UNKNOWABLE: DiaryFieldKey[] = ["inBed", "lightsOut", "solMin", "awakenings", "wasoMin", "finalWake", "outOfBed"];

export const FIELD_META: Record<DiaryFieldKey, { label: string; kind: "clock" | "minutes" | "count" | "quality" }> = {
  inBed: { label: "Got into bed", kind: "clock" },
  lightsOut: { label: "Started trying to sleep", kind: "clock" },
  solMin: { label: "Time to fall asleep", kind: "minutes" },
  awakenings: { label: "Woke up in the night", kind: "count" },
  wasoMin: { label: "Awake during the night", kind: "minutes" },
  finalWake: { label: "Woke up for the day", kind: "clock" },
  outOfBed: { label: "Got out of bed", kind: "clock" },
  quality: { label: "Sleep quality", kind: "quality" },
};
export const FIELD_ORDER: DiaryFieldKey[] = [
  "inBed",
  "lightsOut",
  "solMin",
  "awakenings",
  "wasoMin",
  "finalWake",
  "outOfBed",
  "quality",
];

export const QUALITY_LABELS = ["Very poor", "Poor", "Fair", "Good", "Very good"];

/** A full night as stored and as used by the metrics engine. */
export const NightSchema = DiaryEntrySchema.extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // evening date of the night
  mode: z.enum(["full", "rough"]).default("full"),
  habits: z.array(z.enum(HABIT_KEYS)).default([]),
  sleepAid: z.enum(SLEEP_AID_KEYS).nullable().default(null),
  wokeReasons: z.array(z.enum(WOKE_REASON_KEYS)).default([]), // "pick any that fit"
  wakeNote: z.string().max(500).nullable().default(null), // what woke them, in their own words
  note: z.string().max(2000).nullable().default(null), // patient's own words (verbatim)
  quote: z.string().max(300).nullable().default(null), // verbatim excerpt, checked against note
  dayNote: z.string().max(500).nullable().default(null), // "anything else different?" in the patient's words (HAB-09)
  providerNotes: z.array(z.string().trim().min(1).max(200)).max(8).default([]), // "worth telling your provider" (CHK-15)
  lateEntry: z.boolean().default(false),
  watchTstMin: z.number().int().min(0).max(1000).nullable().default(null),
  watchAnswer: z.enum(["lying_awake", "took_off", "not_sure"]).nullable().default(null),
});
export type Night = z.infer<typeof NightSchema>;
