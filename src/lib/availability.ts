import { prisma } from "@/lib/prisma";
import {
  localToUtc,
  localWeekday,
  todayLocalISO,
  addDaysLocalISO,
  utcToLocalDateISO,
  utcToLocalMinuteOfDay,
  nowUtc,
  minutesBetween,
} from "@/lib/timezone";

const SLOT_GRANULARITY_MINUTES = 15;

export type BookingFormat = "in_person" | "online";
export type Slot = { startUtc: Date; endUtc: Date };

type Interval = { start: number; end: number };

/** Merges overlapping/adjacent/duplicate intervals into a minimal disjoint set. */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];
  for (const iv of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ ...iv });
    }
  }
  return merged;
}

function subtractInterval(intervals: Interval[], block: Interval): Interval[] {
  const result: Interval[] = [];
  for (const iv of intervals) {
    if (block.end <= iv.start || block.start >= iv.end) {
      result.push(iv);
      continue;
    }
    if (block.start > iv.start) result.push({ start: iv.start, end: Math.min(block.start, iv.end) });
    if (block.end < iv.end) result.push({ start: Math.max(block.end, iv.start), end: iv.end });
  }
  return result.filter((iv) => iv.end > iv.start);
}

async function getSchedulingSettings() {
  const settings = await prisma.schedulingSettings.findFirst();
  return (
    settings ?? {
      minNoticeMinutes: 1440,
      maxAdvanceDays: 60,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
    }
  );
}

export async function getOpenIntervalsForDate(
  dateISO: string,
  format: BookingFormat,
): Promise<Interval[]> {
  const weekday = localWeekday(dateISO);
  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { weekday, active: true } }),
    prisma.availabilityException.findMany({ where: { date: dateISO } }),
  ]);

  // An exception with no formatRestriction affects both formats; one with a
  // formatRestriction (e.g. "online only that day") only affects bookings in
  // that format, leaving the other format's hours untouched.
  const applicable = exceptions.filter(
    (e) => !e.formatRestriction || e.formatRestriction === format,
  );

  if (applicable.some((e) => e.isFullDayBlock)) return [];

  let intervals: Interval[] = mergeIntervals(rules.map((r) => ({ start: r.startMinute, end: r.endMinute })));

  for (const exception of applicable) {
    if (exception.startMinute == null || exception.endMinute == null) continue;
    if (exception.kind === "extra_availability") {
      intervals = mergeIntervals([...intervals, { start: exception.startMinute, end: exception.endMinute }]);
    } else if (exception.kind === "block") {
      intervals = subtractInterval(intervals, {
        start: exception.startMinute,
        end: exception.endMinute,
      });
    }
  }

  return intervals.sort((a, b) => a.start - b.start);
}

export async function getAvailableSlots(
  dateISO: string,
  serviceId: string,
  format: BookingFormat,
  excludeAppointmentId?: string,
): Promise<Slot[]> {
  const [service, settings] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    getSchedulingSettings(),
  ]);
  if (!service || !service.active) return [];
  if (service.format !== "both" && service.format !== format) return [];

  const today = todayLocalISO();
  const maxDate = addDaysLocalISO(today, settings.maxAdvanceDays);
  if (dateISO < today || dateISO > maxDate) return [];

  const intervals = await getOpenIntervalsForDate(dateISO, format);
  if (intervals.length === 0) return [];

  const dayStart = localToUtc(dateISO, 0);
  const dayEnd = localToUtc(dateISO, 24 * 60);
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      status: { in: ["pending", "confirmed"] },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    select: { startsAt: true, endsAt: true },
  });

  const busyWindowsUtc = existingAppointments.map((a) => ({
    start: new Date(a.startsAt.getTime() - settings.bufferBeforeMinutes * 60_000),
    end: new Date(a.endsAt.getTime() + settings.bufferAfterMinutes * 60_000),
  }));

  const now = nowUtc();
  const slots: Slot[] = [];

  for (const interval of intervals) {
    for (
      let start = interval.start;
      start + service.durationMin <= interval.end;
      start += SLOT_GRANULARITY_MINUTES
    ) {
      const startUtc = localToUtc(dateISO, start);
      const endUtc = localToUtc(dateISO, start + service.durationMin);

      if (minutesBetween(now, startUtc) < settings.minNoticeMinutes) continue;

      const conflicts = busyWindowsUtc.some(
        (busy) => startUtc < busy.end && endUtc > busy.start,
      );
      if (conflicts) continue;

      slots.push({ startUtc, endUtc });
    }
  }

  return slots;
}

export async function isSlotStillAvailable(
  serviceId: string,
  startUtc: Date,
  format: BookingFormat,
  excludeAppointmentId?: string,
): Promise<boolean> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return false;
  if (service.format !== "both" && service.format !== format) return false;
  const endUtc = new Date(startUtc.getTime() + service.durationMin * 60_000);
  const settings = await getSchedulingSettings();

  const now = nowUtc();
  if (minutesBetween(now, startUtc) < settings.minNoticeMinutes) return false;

  // Re-check against the weekly hours and any one-off blocks/format
  // restrictions, not just against other appointments — otherwise a request
  // could bypass an admin block (e.g. "online only today") by hitting the
  // API directly with a time that was never actually offered.
  const dateISO = utcToLocalDateISO(startUtc);
  const startMinute = utcToLocalMinuteOfDay(startUtc);
  const endMinute = startMinute + service.durationMin;
  const openIntervals = await getOpenIntervalsForDate(dateISO, format);
  const fitsOpenHours = openIntervals.some((iv) => startMinute >= iv.start && endMinute <= iv.end);
  if (!fitsOpenHours) return false;

  const conflict = await prisma.appointment.findFirst({
    where: {
      status: { in: ["pending", "confirmed"] },
      startsAt: { lt: new Date(endUtc.getTime() + settings.bufferAfterMinutes * 60_000) },
      endsAt: { gt: new Date(startUtc.getTime() - settings.bufferBeforeMinutes * 60_000) },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });
  return !conflict;
}
