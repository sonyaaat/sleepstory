// Onboarding answers (ONB-01 to ONB-05). Shared by the onboarding screens and the server action.

import { z } from "zod";
import { MedicationSchema } from "./medications";
import { IsiAnswersSchema, ScreeningSchema } from "./questionnaires";
import { isClock } from "./time";

export const CAFFEINE_OPTIONS = ["None", "Before 2 pm only", "Sometimes after 2 pm", "Often after 2 pm"] as const;
export const ALCOHOL_OPTIONS = ["Rarely", "Weekends only", "Most days"] as const;
export const EXERCISE_OPTIONS = ["Rarely", "1–2 times a week", "3+ times a week"] as const;

const clock = z.string().refine(isClock, "Expected HH:MM");

export const OnboardingSchema = z.object({
  consent: z.literal(true),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reminderTime: clock,
  watchConnected: z.boolean(),
  usual: z.object({
    inBed: clock,
    outOfBed: clock,
    caffeine: z.enum(CAFFEINE_OPTIONS),
    alcohol: z.enum(ALCOHOL_OPTIONS),
    exercise: z.enum(EXERCISE_OPTIONS),
  }),
  medications: z.array(MedicationSchema).max(8),
  isi: IsiAnswersSchema,
  screening: ScreeningSchema,
  /** How many screens the tester changed from Maya's pre-filled answers (session log). */
  changed: z.number().int().min(0).max(10),
  durationMs: z.number().int().min(0),
});
export type OnboardingInput = z.infer<typeof OnboardingSchema>;

/** The line shown on the habit screen: "Your usual day: …". */
export function usualDayLine(u: { caffeine: string; alcohol: string; exercise: string }): string {
  return `caffeine ${u.caffeine.toLowerCase()} · alcohol ${u.alcohol.toLowerCase()} · exercise ${u.exercise.toLowerCase()}.`;
}
