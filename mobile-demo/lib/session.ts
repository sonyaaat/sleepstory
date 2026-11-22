// Browser version of src/db/session.ts: the same functions, backed by the phone's storage instead of a
// database and a cookie. Keep it in step with the real file.

import { addDays, todayISO } from "@/core/time";
import { seedPatients } from "./seed";
import { getState, setState, type StoredPatient, type StoredSession } from "./store";

export type SessionKind = "maya" | "self";

function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

/** Seed data for a session. "self" starts with no data of its own, like the real app. */
function seed(kind: SessionKind, today: string): StoredPatient[] {
  return seedPatients(today)
    .filter((p) => kind === "maya" || !p.isMain)
    .map((p) => ({ ...p, consentAt: p.consentAt?.toISOString() ?? null, sharedAt: p.sharedAt?.toISOString() ?? null }));
}

const toSession = (s: StoredSession) => ({ id: s.id, kind: s.kind, today: s.today, createdAt: new Date(s.createdAt) });

export async function createSession(kind: SessionKind) {
  const today = todayISO();
  const session: StoredSession = { id: newId(), kind, today, createdAt: new Date().toISOString() };
  setState({ v: 1, session, patients: seed(kind, today) });
  await logEvent(session.id, "session_started", { kind });
  return toSession(session);
}

/** The tester's session, or null if they haven't started one. */
export async function currentSession() {
  const s = getState().session;
  return s ? toSession(s) : null;
}

/** Restores this tester's demo data to the start (DEMO-06). */
export async function resetSession(sessionId: string) {
  const s = getState().session;
  if (s?.id !== sessionId) return;
  const today = todayISO();
  setState({ v: 1, session: { ...s, today }, patients: seed(s.kind, today) });
  await logEvent(sessionId, "session_reset");
}

/** Moves the simulated date forward one day (DEMO-05). */
export async function nextMorning(sessionId: string) {
  const state = getState();
  if (state.session?.id !== sessionId) return;
  const today = addDays(state.session.today, 1);
  setState({ ...state, session: { ...state.session, today } });
  await logEvent(sessionId, "next_morning", { today });
}

/** Forgets this phone's session so the next visitor starts fresh (DEMO-07). */
export async function endSession() {
  setState({ v: 1, session: null, patients: [] });
}

/** The session log (DEMO-11) goes to the team's database in the real app; a phone has nowhere to send it. */
export async function logEvent(sessionId: string, type: string, data: Record<string, unknown> = {}) {
  void [sessionId, type, data];
}
