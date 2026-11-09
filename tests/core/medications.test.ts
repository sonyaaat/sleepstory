import { describe, expect, it } from "vitest";
import { medicationUse, planText, type Medication } from "@/core/medications";
import { buildSnapshot } from "@/core/snapshot";
import { mayaPatient } from "@/db/demo-data";
import { addDays } from "@/core/time";
import { night } from "../helpers";

const zopi: Medication = { name: "Zopiclone", kind: "prescription", startedBy: "provider", plan: { type: "as_needed", maxPerWeek: 3 } };
const mela: Medication = { name: "Melatonin", kind: "melatonin", startedBy: "self", plan: null };

describe("medicines", () => {
  it("describes the plan in plain words", () => {
    expect(planText(zopi)).toBe("as needed, up to 3 nights a week");
    expect(planText({ plan: { type: "nightly" } })).toBe("every night");
    expect(planText(mela)).toBeNull();
  });

  it("counts weeks above an as-needed plan, per calendar week", () => {
    const from = "2026-09-14";
    const nights = [0, 1, 2, 3, 7, 8].map((d) => night({ date: addDays(from, d), medicines: ["zopiclone"] }));
    const [z] = medicationUse([zopi], nights, from);
    expect(z.nights).toBe(6);
    expect(z.weeksAbovePlan).toBe(1); // week 1 has 4 nights, week 2 has 2
    expect(z.isNew).toBe(false);
  });

  it("lists a medicine that isn't on the patient's list as new", () => {
    const from = "2026-09-14";
    const nights = [night({ date: addDays(from, 40), medicines: ["Nytol"] })];
    const use = medicationUse([mela], nights, from);
    expect(use.map((u) => u.name)).toEqual(["Melatonin", "Nytol"]);
    expect(use[1]).toMatchObject({ isNew: true, startedBy: "unknown", nights: 1, firstUsed: addDays(from, 40) });
    expect(use[0].nights).toBe(0); // still shown, so the provider sees it wasn't used
  });

  it("tells Maya's story: zopiclone above plan once then stopped, melatonin, a new Nytol", () => {
    const maya = mayaPatient("2026-11-09");
    const s = buildSnapshot(maya, maya.nights, "2026-11-09");
    const [z, m, n] = s.medications;
    expect(z.name).toBe("Zopiclone");
    expect(z.weeksAbovePlan).toBe(1);
    expect(z.secondPerWeek).toBe(0);
    expect(m.name).toBe("Melatonin");
    expect(m.secondPerWeek!).toBeGreaterThan(0);
    expect(n).toMatchObject({ name: "Nytol", isNew: true });
  });
});
