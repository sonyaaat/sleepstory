import { describe, expect, it } from "vitest";
import { isiBand, isiScore, phq2Score, redFlags } from "@/core/questionnaires";

describe("ISI", () => {
  it("sums 7 items", () => {
    expect(isiScore([2, 3, 1, 3, 2, 3, 3])).toBe(17);
  });
  it("rejects wrong length or out-of-range answers", () => {
    expect(() => isiScore([1, 2, 3])).toThrow();
    expect(() => isiScore([5, 0, 0, 0, 0, 0, 0])).toThrow();
  });
  it("uses the standard bands", () => {
    expect([0, 7, 8, 14, 15, 21, 22, 28].map(isiBand)).toEqual([
      "none", "none", "subthreshold", "subthreshold", "moderate", "moderate", "severe", "severe",
    ]);
  });
});

describe("PHQ-2 and red flags", () => {
  const clear = { snoringOrApnea: false, restlessLegs: false, drowsyDriving: false, phq2: [1, 1] };

  it("scores PHQ-2", () => {
    expect(phq2Score([2, 1])).toBe(3);
  });
  it("returns no flags when everything is clear", () => {
    expect(redFlags(clear)).toEqual([]);
  });
  it("flags PHQ-2 of 3 or more with a 'consider' next step", () => {
    const f = redFlags({ ...clear, phq2: [2, 1] });
    expect(f).toHaveLength(1);
    expect(f[0].nextStep).toBe("Consider PHQ-9");
  });
  it("puts urgent drowsy driving first", () => {
    const f = redFlags({ snoringOrApnea: true, restlessLegs: true, drowsyDriving: true, phq2: [3, 3] });
    expect(f.map((x) => x.key)).toEqual(["drowsy_driving", "apnea", "rls", "mood"]);
    expect(f[0].urgent).toBe(true);
  });
  it("never uses diagnostic wording", () => {
    const f = redFlags({ snoringOrApnea: true, restlessLegs: true, drowsyDriving: true, phq2: [3, 3] });
    for (const x of f) expect(`${x.label} ${x.nextStep}`).not.toMatch(/diagnos|detect|doctor/i);
  });
});
