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
  it("derives usual times from medians, rounded and in order", () => {
    const nights = [
      night({ inBed: "00:20", lightsOut: "00:05" }),
      night({ inBed: "00:35", lightsOut: "00:10" }),
      night({ inBed: "23:50", lightsOut: "23:55" }),
    ];
    const u = usualTimesFrom(nights, usual);
    expect(u.inBed).toBe("00:15");
    expect(u.lightsOut).toBe("00:15"); // never before getting into bed
    expect(usualTimesFrom([], usual)).toEqual(usual);
  });
  it("produces consistent rough-night fields from Maya's data", async () => {
    const { mayaNights } = await import("@/db/demo-data");
    const { consistencyIssues } = await import("@/core/metrics");
    const u = usualTimesFrom(mayaNights("2026-11-09"), usual);
    const { fields } = fillRoughNight({ solMin: 120, wasoMin: 120, quality: 1 }, u);
    expect(consistencyIssues(fields)).toEqual([]);
  });
});

describe("habit detection in free text", async () => {
  const { detectHabits } = await import("@/core/habit-detect");
  it("finds known habits and sleep aids in a day note", () => {
    const r = detectHabits("Had two glasses of wine at a friend's place, then took a melatonin");
    expect(r.habits).toEqual(["alcohol"]);
    expect(r.sleepAid).toBe("melatonin");
  });
  it("returns nothing for things that don't fit a chip", () => {
    expect(detectHabits("Started a new part-time job, closing shift")).toEqual({ habits: [], sleepAid: null });
  });
});
