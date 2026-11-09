import { describe, expect, it } from "vitest";
import { diaryRows, nightsPerWeek, overallTrend, type DiaryRow } from "@/core/snapshot-summary";
import type { Snapshot } from "@/core/snapshot";

const period = (solMed: number | null, wasoMed: number | null, tstMed: number | null, seMed: number | null) =>
  ({ solMed, wasoMed, tstMed, seMed }) as Snapshot["periods"]["first"];

const snap = (first: Snapshot["periods"]["first"], second: Snapshot["periods"]["second"]) =>
  ({ periods: { first, second } }) as Snapshot;

describe("diaryRows", () => {
  it("marks direction per measure and ignores tiny changes", () => {
    const rows = diaryRows(snap(period(50, 55, 328, 72), period(45, 25, 348, 73)));
    expect(rows.map((r) => r.better)).toEqual([true, true, true, null]);
  });

  it("returns null when a period has no data", () => {
    const rows = diaryRows(snap(period(null, 30, 400, 80), period(20, 30, 400, 80)));
    expect(rows[0].better).toBeNull();
  });
});

describe("overallTrend", () => {
  const row = (better: boolean | null): DiaryRow => ({ key: "sol", label: "", before: 1, now: 1, better });
  it("calls the majority direction", () => {
    expect(overallTrend([row(true), row(true), row(false), row(null)]).trend).toBe("better");
    expect(overallTrend([row(false), row(false), row(true)]).trend).toBe("worse");
    expect(overallTrend([row(true), row(false), row(null)]).trend).toBe("same");
  });
});

describe("nightsPerWeek", () => {
  it("rounds to whole nights", () => {
    expect(nightsPerWeek(1.9)).toBe(2);
    expect(nightsPerWeek(0.4)).toBe(0);
    expect(nightsPerWeek(null)).toBeNull();
  });
});
