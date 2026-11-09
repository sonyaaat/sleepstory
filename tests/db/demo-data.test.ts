import { describe, expect, it } from "vitest";
import { extraPatients, mayaNights, mayaPatient } from "@/db/demo-data";
import { comparePeriods, completeness, watchComparison } from "@/core/metrics";
import { linkedToBadNights } from "@/core/habits";
import { isiBand, isiScore, redFlags } from "@/core/questionnaires";
import { addDays } from "@/core/time";

const today = "2026-11-09";

// Maya's data has to tell the story in docs/DEMO_SCENARIOS.md (scenario 2).
describe("Maya's demo data", () => {
  const maya = mayaPatient(today);
  const nights = maya.nights;
  const last = addDays(today, -1);

  it("is repeatable", () => {
    expect(mayaNights(today)).toEqual(nights);
  });
  it("leaves last night empty for the tester to log", () => {
    expect(nights.find((n) => n.date === last)).toBeUndefined();
  });
  it("has realistic gaps and late entries", () => {
    const c = completeness(nights, addDays(last, -55), last);
    expect(c.days).toBe(56);
    expect(c.logged).toBeGreaterThanOrEqual(42);
    expect(c.logged).toBeLessThanOrEqual(53);
    expect(c.late).toBeGreaterThanOrEqual(1);
  });
  it("shows improvement from the first to the last 4 weeks", () => {
    const { first, second } = comparePeriods(nights, last);
    expect(second.solMed!).toBeLessThan(first.solMed!);
    expect(second.seMed!).toBeGreaterThan(first.seMed!);
    expect(first.aidPerWeek.prescription!).toBeGreaterThan(0);
    expect(second.aidPerWeek.prescription).toBe(0);
    expect(second.aidPerWeek.melatonin!).toBeGreaterThan(0);
  });
  it("links late caffeine to bad nights", () => {
    const links = linkedToBadNights(nights);
    expect(links.map((l) => l.habit)).toContain("caffeine_late");
  });
  it("has a watch that overestimates sleep, with explanations", () => {
    const w = watchComparison(nights);
    expect(w.diffMed!).toBeGreaterThan(15);
    expect(w.mismatched).toBeGreaterThanOrEqual(5);
    expect(w.answers.lying_awake).toBeGreaterThan(0);
  });
  it("has ISI moderate -> subthreshold and a PHQ-2 flag", () => {
    expect(isiBand(isiScore(maya.isiBaseline!))).toBe("moderate");
    expect(isiBand(isiScore(maya.isiPrevisit!))).toBe("subthreshold");
    expect(redFlags(maya.screening!).map((f) => f.key)).toEqual(["mood"]);
  });
  it("has verbatim quotes that appear in the notes", () => {
    const withQuotes = nights.filter((n) => n.quote);
    expect(withQuotes.length).toBeGreaterThanOrEqual(3);
    for (const n of withQuotes) expect(n.note).toContain(n.quote);
  });
});

describe("extra students", () => {
  it("has two lighter patients, one not shared", () => {
    const extra = extraPatients(today);
    expect(extra).toHaveLength(2);
    expect(extra.filter((p) => p.sharedAt === null)).toHaveLength(1);
    for (const p of extra) expect(p.nights.length).toBeGreaterThan(5);
  });
});
