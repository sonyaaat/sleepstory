// Time helpers for sleep diary data.
// A "night" is identified by the date of the evening it starts (YYYY-MM-DD).
// Clock times are "HH:MM" (24h). To compare times across midnight we map every
// clock time onto a timeline that starts at noon of the night's date.

export function parseClock(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`Invalid time: ${hhmm}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) throw new Error(`Invalid time: ${hhmm}`);
  return h * 60 + min;
}

export function isClock(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    parseClock(value);
    return true;
  } catch {
    return false;
  }
}

/** Minutes since 12:00 (noon) on the night's date. 23:00 -> 660, 02:00 -> 840. */
export function nightMinutes(hhmm: string): number {
  return (parseClock(hhmm) - 720 + 1440) % 1440;
}

export function formatClock(minutesOfDay: number): string {
  const m = ((Math.round(minutesOfDay) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Human-friendly 12h clock: "00:30" -> "12:30 am". */
export function formatClock12(hhmm: string): string {
  const total = parseClock(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** 325 -> "5 h 25 m"; 45 -> "45 min". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "–";
  const m = Math.round(minutes);
  if (Math.abs(m) < 60) return `${m} min`;
  const h = Math.floor(Math.abs(m) / 60);
  const rest = Math.abs(m) % 60;
  const sign = m < 0 ? "-" : "";
  return rest === 0 ? `${sign}${h} h` : `${sign}${h} h ${String(rest).padStart(2, "0")}`;
}

// ---- Calendar dates (YYYY-MM-DD), always handled in UTC to avoid DST bugs ----

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function todayISO(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-11-08" -> "Nov 8" */
export function formatDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** "2026-11-08" -> "Sun, Nov 8" */
export function formatDateLong(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]}, ${formatDate(date)}`;
}

export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}
