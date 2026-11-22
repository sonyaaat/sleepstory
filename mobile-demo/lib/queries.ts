// Browser version of src/db/queries.ts: the same functions and shapes, read from the phone's copy of
// the data. Keep it in step with the real file.

import type { PatientView } from "@/db/mappers";
import { navigate } from "./navigation";
import { currentSession } from "./session";
import { getState, type StoredPatient } from "./store";

function toView(p: StoredPatient): PatientView {
  return {
    id: p.id,
    isMain: p.isMain,
    name: p.name,
    age: p.age,
    providerName: p.providerName,
    visitDate: p.visitDate,
    consentAt: p.consentAt ? new Date(p.consentAt) : null,
    usualDay: p.usualDay,
    isiBaseline: p.isiBaseline,
    isiPrevisit: p.isiPrevisit,
    screening: p.screening,
    discuss: p.discuss,
    sharedAt: p.sharedAt ? new Date(p.sharedAt) : null,
    watchConnected: p.watchConnected,
    medications: p.medications,
  };
}

function patientsOf(sessionId: string) {
  const s = getState();
  return s.session?.id === sessionId ? s.patients : [];
}

/** The tester's session, or back to the start screen (like the real redirect). */
export async function requireSession() {
  const session = await currentSession();
  if (!session) {
    navigate("/", { replace: true });
    return new Promise<never>(() => {}); // this page is being left
  }
  return session;
}

export async function mainPatient(sessionId: string) {
  const p = patientsOf(sessionId).find((x) => x.isMain);
  return p ? { patient: toView(p), nights: p.nights } : null;
}

export async function patientWithNights(sessionId: string, patientId: string) {
  const p = patientsOf(sessionId).find((x) => x.id === patientId);
  return p ? { patient: toView(p), nights: p.nights } : null;
}

export async function patientList(sessionId: string) {
  return [...patientsOf(sessionId)]
    .sort((a, b) => a.visitDate.localeCompare(b.visitDate))
    .map((p) => ({ ...toView(p), nightCount: p.nights.length }));
}
