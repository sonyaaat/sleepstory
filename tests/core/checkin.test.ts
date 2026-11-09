import { describe, expect, it } from "vitest";
import { fillRoughNight, followUpQuestion, forgivingStreak, usualTimesFrom } from "@/core/checkin";
import { night } from "../helpers";

describe("forgiving streak", () => {
  it("counts nights in the last 7 and never resets to zero after one gap", () => {
    const dates = ["2026-11-07", "2026-11-06", "2026-11-04", "2026-11-03", "2026-11-02", "2026-10-20"];
    expect(forgivingStreak(dates, "2026-11-08")).toEqual({ logged: 5, window: 7 });
  });
  it("doesn't count tonight", () => {
    expect(forgivingStreak(["2026-11-08"], "2026-11-08").logged).toBe(0);
  });
});

describe("follow-up question", () => {
  it("asks what woke you up when there were awakenings", () => {
    expect(followUpQuestion({ awakenings: 2, solMin: 60 })).toBe("woke_reason");
  });
  it("asks what kept you awake when falling asleep took 30+ min", () => {
    expect(followUpQuestion({ awakenings: 0, solMin: 30 })).toBe("kept_awake");
  });
  it("skips otherwise", () => {
    expect(followUpQuestion({ awakenings: 0, solMin: 10 })).toBeNull();
  });
});

describe("rough-night mode", () => {
  const usual = { inBed: "00:00", lightsOut: "00:15", finalWake: "08:00", outOfBed: "08:15" };
  it("fills clock fields from usual times and marks them assumed", () => {
    const { fields, assumed } = fillRoughNight({ solMin: 90, wasoMin: 60, quality: 1 }, usual);
    expect(fields.inBed).toBe("00:00");
    expect(fields.solMin).toBe(90);
    expect(fields.awakenings).toBe(1);
    expect(assumed).toContain("inBed");
    expect(assumed).not.toContain("solMin");
  });
  it("derives usual times from the most common past values", () => {
    const nights = [night({ inBed: "00:30" }), night({ inBed: "00:30" }), night({ inBed: "23:00" })];
    expect(usualTimesFrom(nights, usual).inBed).toBe("00:30");
    expect(usualTimesFrom([], usual)).toEqual(usual);
  });
});
