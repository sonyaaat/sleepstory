import { describe, expect, it } from "vitest";
import {
  comparePeriods,
  completeness,
  consistencyIssues,
  isWatchMismatch,
  median,
  nightMetrics,
  periodStats,
  seSeries,
  watchComparison,
} from "@/core/metrics";
import { addDays } from "@/core/time";
import { night } from "../helpers";

describe("nightMetrics", () => {
  it("computes TIB, TST and SE for a night crossing midnight", () => {
    // 23:30 -> 07:30 = 480 min in bed; 480 - 20 - 30 = 430 asleep
    const m = nightMetrics(night());
    expect(m.tibMin).toBe(480);
    expect(m.tstMin).toBe(430);
    expect(m.sePct).toBeCloseTo(89.58, 1);
  });
  it("handles Maya's scenario: bed 00:30, 60 min to sleep, 40 min awake, up 08:15", () => {
    const m = nightMetrics(
      night({ inBed: "00:30", lightsOut: "00:30", solMin: 60, awakenings: 2, wasoMin: 40, finalWake: "08:15", outOfBed: "08:15" }),
    );
    expect(m.tibMin).toBe(465);
    expect(m.tstMin).toBe(365);
    expect(m.sePct).toBeCloseTo(78.5, 1);
  });
  it("uses lights-out and final wake for TST, not bed times", () => {
    const m = nightMetrics(night({ inBed: "23:00", lightsOut: "23:30", finalWake: "07:00", outOfBed: "07:30" }));
    expect(m.tibMin).toBe(510);
    expect(m.tstMin).toBe(450 - 50);
  });
  it("never returns negative sleep", () => {
    const m = nightMetrics(night({ solMin: 400, wasoMin: 200 }));
    expect(m.tstMin).toBe(0);
    expect(m.sePct).toBe(0);
  });
});

describe("consistencyIssues", () => {
  it("accepts a normal night", () => {
    expect(consistencyIssues(night())).toEqual([]);
  });
  it("catches impossible orderings and totals", () => {
    expect(consistencyIssues(night({ lightsOut: "23:00" }))).toHaveLength(1);
    expect(consistencyIssues(night({ outOfBed: "07:00" }))).toHaveLength(1);
    expect(consistencyIssues(night({ solMin: 300, wasoMin: 300 }))).toHaveLength(1);
    expect(consistencyIssues(night({ awakenings: 0, wasoMin: 30 }))).toHaveLength(1);
  });
});

describe("median", () => {
  it("handles odd, even and empty lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNull();
  });
});

describe("periods", () => {
  const nights = Array.from({ length: 56 }, (_, i) =>
    night({
      date: addDays("2026-09-14", i),
      solMin: i < 28 ? 60 : 20,
      sleepAid: i % 7 === 0 ? "melatonin" : null,
    }),
  );

  it("splits 8 weeks into two 4-week halves", () => {
    const { first, second } = comparePeriods(nights, "2026-11-08");
    expect(first.from).toBe("2026-09-14");
    expect(first.to).toBe("2026-10-11");
    expect(second.from).toBe("2026-10-12");
    expect(first.nightsLogged).toBe(28);
    expect(second.nightsLogged).toBe(28);
    expect(first.solMed).toBe(60);
    expect(second.solMed).toBe(20);
    expect(first.aidPerWeek.melatonin).toBe(1);
    expect(first.aidPerWeek.prescription).toBe(0);
  });

  it("counts poor nights per 7 logged nights", () => {
    const s = periodStats(nights, "2026-09-14", "2026-10-11");
    // solMin 60: TST 390/480 = 81% -> poor every night
    expect(s.poorPerWeek).toBe(7);
  });

  it("reports completeness and late entries", () => {
    const some = [night({ date: "2026-11-01" }), night({ date: "2026-11-03", lateEntry: true })];
    expect(completeness(some, "2026-11-01", "2026-11-07")).toEqual({ days: 7, logged: 2, late: 1 });
  });

  it("builds a 7-night rolling average", () => {
    const s = seSeries(nights.slice(0, 3), "2026-09-14", "2026-09-16");
    expect(s).toHaveLength(3);
    expect(s[2].avg7).toBeCloseTo(s[0].se, 5);
  });
});

describe("watch comparison", () => {
  it("flags gaps of 60 minutes or more", () => {
    expect(isWatchMismatch(night({ watchTstMin: 490 }))).toBe(true); // diary 430
    expect(isWatchMismatch(night({ watchTstMin: 480 }))).toBe(false);
    expect(isWatchMismatch(night({ watchTstMin: null }))).toBe(false);
  });
  it("summarises watch vs diary and the patient's explanations", () => {
    const w = watchComparison([
      night({ watchTstMin: 500, watchAnswer: "lying_awake" }),
      night({ watchTstMin: 440 }),
      night({ watchTstMin: null }),
    ]);
    expect(w.nightsWithWatch).toBe(2);
    expect(w.diaryTstMed).toBe(430);
    expect(w.diffMed).toBe(40);
    expect(w.mismatched).toBe(1);
    expect(w.answers.lying_awake).toBe(1);
  });
});
