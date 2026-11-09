// Demo sessions (DEMO-03, DEMO-05 to DEMO-07): each tester gets their own copy of the data.
// Server-only: uses the request cookies.

import "server-only";
import { cookies } from "next/headers";
import { addDays, todayISO } from "@/core/time";
import { prisma } from "./client";
import { extraPatients, mayaPatient, type DemoPatient } from "./demo-data";
import { nightToRow, patientToRow } from "./mappers";

export const SESSION_COOKIE = "sleepstory_session";
export type SessionKind = "maya" | "self";

async function insertPatients(sessionId: string, patients: DemoPatient[]) {
  for (const p of patients) {
    await prisma.patient.create({
      data: {
        ...patientToRow(p),
        sessionId,
        nights: { create: p.nights.map((n) => ({ ...nightToRow(n), source: "seed" })) },
      },
    });
  }
}

/** Seed data for a session. "self" starts with no data of its own (onboarding comes in P1). */
async function seed(sessionId: string, kind: SessionKind, today: string) {
  const extras = extraPatients(today);
  await insertPatients(sessionId, kind === "maya" ? [mayaPatient(today), ...extras] : extras);
}

export async function createSession(kind: SessionKind) {
  const today = todayISO();
  const session = await prisma.session.create({ data: { kind, today } });
  await seed(session.id, kind, today);
  (await cookies()).set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  await logEvent(session.id, "session_started", { kind });
  return session;
}

/** The current tester's session, or null if they haven't started one. */
export async function currentSession() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.session.findUnique({ where: { id } });
}

/** Restores this tester's demo data to the start (DEMO-06). */
export async function resetSession(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  const today = todayISO();
  await prisma.patient.deleteMany({ where: { sessionId } });
  await prisma.session.update({ where: { id: sessionId }, data: { today } });
  await seed(sessionId, session.kind as SessionKind, today);
  await logEvent(sessionId, "session_reset");
}

/** Moves the simulated date forward one day (DEMO-05). */
export async function nextMorning(sessionId: string) {
  const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
  await prisma.session.update({ where: { id: sessionId }, data: { today: addDays(session.today, 1) } });
  await logEvent(sessionId, "next_morning", { today: addDays(session.today, 1) });
}

/** Forgets the session cookie so the next visitor starts fresh (DEMO-07). */
export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Session log for evaluation (DEMO-11). */
export async function logEvent(sessionId: string, type: string, data: Record<string, unknown> = {}) {
  await prisma.event.create({ data: { sessionId, type, data: JSON.stringify(data) } });
}
