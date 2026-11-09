// Converts database rows to the core types and back. JSON columns are strings (SQLite).

import type { Night as NightRow, Patient as PatientRow, Prisma } from "@prisma/client";
import { NightSchema, type Night } from "@/core/schema";
import type { IsiAnswers, Screening } from "@/core/questionnaires";
import type { DemoPatient, UsualDay } from "./demo-data";

const json = <T,>(s: string | null): T | null => (s ? (JSON.parse(s) as T) : null);

export function nightFromRow(row: NightRow): Night {
  return NightSchema.parse({ ...row, habits: JSON.parse(row.habits) });
}

export function nightToRow(n: Night): Omit<Prisma.NightUncheckedCreateInput, "patientId"> {
  return { ...n, habits: JSON.stringify(n.habits) };
}

export interface PatientView {
  id: string;
  isMain: boolean;
  name: string;
  age: number;
  providerName: string;
  visitDate: string;
  consentAt: Date | null;
  usualDay: UsualDay | null;
  isiBaseline: IsiAnswers | null;
  isiPrevisit: IsiAnswers | null;
  screening: Screening | null;
  discuss: string | null;
  sharedAt: Date | null;
  watchConnected: boolean;
}

export function patientFromRow(row: PatientRow): PatientView {
  return {
    ...row,
    usualDay: json<UsualDay>(row.usualDay),
    isiBaseline: json<IsiAnswers>(row.isiBaseline),
    isiPrevisit: json<IsiAnswers>(row.isiPrevisit),
    screening: json<Screening>(row.screening),
  };
}

export function patientToRow(p: DemoPatient) {
  return {
    isMain: p.isMain,
    name: p.name,
    age: p.age,
    providerName: p.providerName,
    visitDate: p.visitDate,
    consentAt: p.consentAt,
    usualDay: JSON.stringify(p.usualDay),
    isiBaseline: p.isiBaseline && JSON.stringify(p.isiBaseline),
    isiPrevisit: p.isiPrevisit && JSON.stringify(p.isiPrevisit),
    screening: p.screening && JSON.stringify(p.screening),
    discuss: p.discuss,
    sharedAt: p.sharedAt,
    watchConnected: p.watchConnected,
  };
}
