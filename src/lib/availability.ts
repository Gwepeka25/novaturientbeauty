import { prisma } from "@/lib/prisma";
import {
  localToUtc,
  localWeekday,
  todayLocalISO,
  addDaysLocalISO,
  nowUtc,
  minutesBetween,
} from "@/lib/timezone";

const SLOT_GRANULARITY_MINUTES = 15;

export type Slot = { startUtc: Date; endUtc: Date };

type Interval = { start: number; end: number };

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

export async function getOpenIntervalsForDate(dateISO: string): Promise<Interval[]> {
  const weekday = localWeekday(dateISO);
  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({ where: { weekday, active: true } }),
    prisma.availabilityException.findMany({ where: { date: dateISO } }),
  ]);

  if (exceptions.some((e) => e.isFullDayBlock)) return [];

  let intervals: Interval[] = rules.map((r) => ({ start: r.startMinute, end: r.endMinute }));

  for (const exception of exceptions) {
    if (exception.startMinute == null || exception.endMinute == null) continue;
    if (exception.kind === "extra_availability") {
      intervals.push({ start: exception.startMinute, end: exception.endMinute });
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
  excludeAppointmentId?: string,
): Promise<Slot[]> {
  const [service, settings] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    getSchedulingSettings(),
  ]);
  if (!service || !service.active) return [];

  const today = todayLocalISO();
  const maxDate = addDaysLocalISO(today, settings.maxAdvanceDays);
  if (dateISO < today || dateISO > maxDate) return [];

  const intervals = await getOpenIntervalsForDate(dateISO);
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
  excludeAppointmentId?: string,
): Promise<boolean> {
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return false;
  const endUtc = new Date(startUtc.getTime() + service.durationMin * 60_000);
  const settings = await getSchedulingSettings();

  const now = nowUtc();
  if (minutesBetween(now, startUtc) < settings.minNoticeMinutes) return false;

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
