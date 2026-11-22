// Maya and the two extra students, from the app's own made-up data generator (src/db/demo-data.ts).

import { extraPatients, mayaPatient, type DemoPatient } from "@/db/demo-data";

/** Readable, stable ids, so each Snapshot page can be built ahead of time (/provider/snapshot/maya/). */
export function demoPatientId(p: Pick<DemoPatient, "name">): string {
  return p.name.split(" ")[0].toLowerCase();
}

export function seedPatients(today: string): (DemoPatient & { id: string })[] {
  return [mayaPatient(today), ...extraPatients(today)].map((p) => ({ ...p, id: demoPatientId(p) }));
}

export function demoPatientIds(): string[] {
  return seedPatients("2026-01-01").map((p) => p.id);
}
