import { DateTime } from "luxon";

export const TIMEZONE = "Europe/Brussels";

/** Combine a local "YYYY-MM-DD" date and minutes-from-midnight into a UTC Date, DST-correct. */
export function localToUtc(dateISO: string, minuteOfDay: number): Date {
  const [year, month, day] = dateISO.split("-").map(Number);
  const dt = DateTime.fromObject(
    { year, month, day, hour: 0, minute: 0 },
    { zone: TIMEZONE },
  ).plus({ minutes: minuteOfDay });
  return dt.toUTC().toJSDate();
}

/** Local calendar date ("YYYY-MM-DD" in Europe/Brussels) that a UTC instant falls on. */
export function utcToLocalDateISO(date: Date): string {
  return DateTime.fromJSDate(date, { zone: "utc" }).setZone(TIMEZONE).toISODate()!;
}

/** Minutes since local midnight (Europe/Brussels) that a UTC instant falls at. */
export function utcToLocalMinuteOfDay(date: Date): number {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(TIMEZONE);
  return dt.hour * 60 + dt.minute;
}

export function localWeekday(dateISO: string): number {
  // Luxon weekday is 1=Monday..7=Sunday; our schema uses 0=Sunday..6=Saturday.
  const [year, month, day] = dateISO.split("-").map(Number);
  const dt = DateTime.fromObject({ year, month, day }, { zone: TIMEZONE });
  return dt.weekday % 7;
}

export function todayLocalISO(): string {
  return DateTime.now().setZone(TIMEZONE).toISODate()!;
}

export function nowUtc(): Date {
  return DateTime.now().toUTC().toJSDate();
}

export function minutesBetween(a: Date, b: Date): number {
  return DateTime.fromJSDate(b).diff(DateTime.fromJSDate(a), "minutes").minutes;
}

export function formatLocalTime(date: Date): string {
  return DateTime.fromJSDate(date).setZone(TIMEZONE).toFormat("HH:mm");
}

export function formatLocalDateTime(date: Date): string {
  return DateTime.fromJSDate(date)
    .setZone(TIMEZONE)
    .toFormat("cccc d LLLL yyyy 'at' HH:mm");
}

export function addDaysLocalISO(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return DateTime.fromObject({ year, month, day }, { zone: TIMEZONE })
    .plus({ days })
    .toISODate()!;
}
