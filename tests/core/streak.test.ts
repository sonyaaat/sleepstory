import { describe, expect, it } from "vitest";
import { dayStreak } from "@/core/checkin";
import { addDays } from "@/core/time";

const today = "2026-11-10";
const nights = (...ago: number[]) => ago.map((i) => addDays(today, -i));
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, k) => from + k);

describe("dayStreak", () => {
  it("counts consecutive nights back from last night", () => {
    expect(dayStreak(nights(1, 2, 3), today).days).toBe(3);
  });

  it("forgives one missed night in a week", () => {
    const s = dayStreak(nights(1, 2, 4, 5, 6), today);
    expect(s.days).toBe(5);
    expect(s.forgiven).toBe(1);
  });

  it("ends the streak at a second miss within 7 days", () => {
    expect(dayStreak(nights(1, 3, 5, 6), today).days).toBe(2);
  });

  it("still counts when last night isn't logged yet", () => {
    expect(dayStreak(nights(2, 3, 4), today).days).toBe(3);
  });

  it("doesn't spend the weekly pass on a morning that isn't over yet", () => {
    const s = dayStreak(nights(2, 3, 5, 6, 7), today);
    expect(s.days).toBe(5);
    expect(s.forgiven).toBe(1);
  });

  it("reports milestones", () => {
    const s = dayStreak(nights(...range(1, 7)), today);
    expect(s.reached).toBe(7);
    expect(s.next).toBe(14);
    expect(dayStreak([], today)).toMatchObject({ days: 0, forgiven: 0, next: 3, reached: null });
  });
});
