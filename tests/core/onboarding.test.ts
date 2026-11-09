import { describe, expect, it } from "vitest";
import { OnboardingSchema, usualDayLine } from "@/core/onboarding";

const valid = {
  consent: true,
  visitDate: "2026-11-13",
  reminderTime: "07:30",
  watchConnected: true,
  usual: { inBed: "00:15", outOfBed: "08:15", caffeine: "Sometimes after 2 pm", alcohol: "Weekends only", exercise: "1–2 times a week", other: ["Studies in bed"] },
  medications: [{ name: "Melatonin", kind: "melatonin", startedBy: "self", plan: null }],
  isi: [3, 3, 2, 3, 3, 3, 3],
  screening: { snoringOrApnea: false, restlessLegs: false, drowsyDriving: true, phq2: [2, 1] },
  changed: 1,
  durationMs: 60000,
};

describe("onboarding", () => {
  it("accepts Maya's answers", () => {
    expect(OnboardingSchema.safeParse(valid).success).toBe(true);
  });
  it("requires consent", () => {
    expect(OnboardingSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
  });
  it("rejects answers outside the offered options and malformed times", () => {
    expect(OnboardingSchema.safeParse({ ...valid, usual: { ...valid.usual, caffeine: "Lots" } }).success).toBe(false);
    expect(OnboardingSchema.safeParse({ ...valid, reminderTime: "7.30" }).success).toBe(false);
    expect(OnboardingSchema.safeParse({ ...valid, isi: [9, 0, 0, 0, 0, 0, 0] }).success).toBe(false);
  });
  it("writes the usual-day line shown on the habit screen", () => {
    expect(usualDayLine(valid.usual)).toBe("caffeine sometimes after 2 pm · alcohol weekends only · exercise 1–2 times a week.");
    expect(usualDayLine({ ...valid.usual, otherHabits: ["Studies in bed"] })).toBe(
      "caffeine sometimes after 2 pm · alcohol weekends only · exercise 1–2 times a week · studies in bed.",
    );
  });
});
