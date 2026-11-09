import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "./client";
import { nightFromRow, patientFromRow } from "./mappers";
import { currentSession } from "./session";

/** The tester's session, or a redirect to the start screen. */
export async function requireSession() {
  const session = await currentSession();
  if (!session) redirect("/");
  return session;
}

export async function mainPatient(sessionId: string) {
  const row = await prisma.patient.findFirst({ where: { sessionId, isMain: true }, include: { nights: true } });
  if (!row) return null;
  return { patient: patientFromRow(row), nights: row.nights.map(nightFromRow), rows: row.nights };
}

export async function patientWithNights(sessionId: string, patientId: string) {
  const row = await prisma.patient.findFirst({ where: { id: patientId, sessionId }, include: { nights: true } });
  if (!row) return null;
  return { patient: patientFromRow(row), nights: row.nights.map(nightFromRow) };
}

export async function patientList(sessionId: string) {
  const rows = await prisma.patient.findMany({
    where: { sessionId },
    include: { _count: { select: { nights: true } } },
    orderBy: { visitDate: "asc" },
  });
  return rows.map((r) => ({ ...patientFromRow(r), nightCount: r._count.nights }));
}
