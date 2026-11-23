// The phone's own copy of the demo data: one session per phone (DEMO-03), kept in localStorage so a
// refresh doesn't lose it. If storage is blocked (some private windows), it lives in memory instead.

import type { Medication } from "@/core/medications";
import type { IsiAnswers, Screening } from "@/core/questionnaires";
import type { Night } from "@/core/schema";
import type { UsualDay } from "@/db/demo-data";

export interface StoredSession {
  id: string;
  kind: "maya" | "self";
  /** Simulated date YYYY-MM-DD. */
  today: string;
  createdAt: string;
}

/** Same fields as a Patient row (src/db/mappers.ts PatientView), with dates as ISO strings. */
export interface StoredPatient {
  id: string;
  isMain: boolean;
  name: string;
  age: number;
  providerName: string;
  visitDate: string;
  consentAt: string | null;
  usualDay: UsualDay | null;
  isiBaseline: IsiAnswers | null;
  isiPrevisit: IsiAnswers | null;
  screening: Screening | null;
  discuss: string | null;
  sharedAt: string | null;
  watchConnected: boolean;
  medications: Medication[];
  nights: Night[];
}

export interface DemoState {
  v: 1;
  session: StoredSession | null;
  patients: StoredPatient[];
}

const KEY = "sleepstory-demo";
const EMPTY: DemoState = { v: 1, session: null, patients: [] };

function load(): DemoState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "null") as DemoState | null;
    return saved?.v === 1 && Array.isArray(saved.patients) ? saved : EMPTY;
  } catch {
    return EMPTY;
  }
}

let state: DemoState = load();
let version = 0;
const listeners = new Set<() => void>();

function notify() {
  version++;
  listeners.forEach((listener) => listener());
}

export const getState = () => state;

/** Goes up by one on every change; pages re-run when it does (like revalidatePath on the server). */
export const getVersion = () => version;

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setState(next: DemoState) {
  state = next;
  try {
    if (next.session) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage is blocked or full: keep going in memory.
  }
  notify();
}

// The demo is open in another tab and changed the data there.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY && e.key !== null) return;
    state = load();
    notify();
  });
}
