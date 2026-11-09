import { describe, expect, it } from "vitest";
import { biggestChange, buildSnapshot } from "@/core/snapshot";
import { periodStats } from "@/core/metrics";
import { mayaPatient } from "@/db/demo-data";
import { night } from "../helpers";

const today = "2026-11-09";

describe("buildSnapshot with Maya's data", () => {
  const maya = mayaPatient(today);
  const s = buildSnapshot(maya, maya.nights, today);

  it("covers the 8 weeks before today", () => {
    expect(s.from).toBe("2026-09-14");
    expect(s.to).toBe("2026-11-08");
    expect(s.completeness.days).toBe(56);
  });
  it("shows ISI moderate -> subthreshold and the PHQ-2 flag", () => {
    expect(s.isi.baseline).toEqual({ score: 20, band: "moderate" });
    expect(s.isi.now).toEqual({ score: 14, band: "subthreshold" });
    expect(s.flags.map((f) => f.key)).toEqual(["mood"]);
  });
  it("has a biggest change that is an improvement", () => {
    expect(s.biggestChange?.better).toBe(true);
  });
  it("shows the newest quote first, so a tester sees their own", () => {
    const withNew = [...maya.nights, night({ date: "2026-11-08", quote: "my own words tonight", note: "my own words tonight" })];
    const s2 = buildSnapshot(maya, withNew, today);
    expect(s2.quotes[0]).toEqual({ date: "2026-11-08", text: "my own words tonight" });
    expect(s2.quotes).toHaveLength(2);
  });
  it("shows up to 3 recent day notes, newest first", () => {
    expect(s.dayNotes.length).toBeGreaterThan(0);
    expect(s.dayNotes.length).toBeLessThanOrEqual(3);
    const dates = s.dayNotes.map((n) => n.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
  it("finds racing thoughts as the most common reason for waking", () => {
    expect(s.wakeReason?.key).toBe("worry");
    expect(s.wakeReason!.count).toBeLessThanOrEqual(s.wakeReason!.nights);
  });
  it("lists the screening items that came back clear", () => {
    expect(s.clearScreening).toContain("No drowsy driving reported");
    expect(s.clearScreening.some((x) => x.startsWith("PHQ-2"))).toBe(false); // PHQ-2 was positive
  });
  it("has one calendar day per night of the period and 8 weekly medians", () => {
    expect(s.days).toHaveLength(56);
    expect(s.days[0].date).toBe(s.from);
    expect(s.days.at(-1)!.date).toBe(s.to);
    expect(s.days.filter((d) => d.logged)).toHaveLength(s.completeness.logged);
    expect(s.weeks).toHaveLength(8);
    expect(s.weeks.reduce((n, w) => n + w.nightsLogged, 0)).toBe(s.completeness.logged);
  });
  it("has at most 3 habit links", () => {
    expect(s.links.length).toBeGreaterThan(0);
    expect(s.links.length).toBeLessThanOrEqual(3);
  });
});

describe("biggestChange", () => {
  it("ignores changes under 5%", () => {
    const a = periodStats([night()], "2026-11-01", "2026-11-01");
    expect(biggestChange(a, a)).toBeNull();
  });
});
