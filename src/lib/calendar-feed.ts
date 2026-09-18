import { nanoid } from "nanoid";
import { createEvents, type EventAttributes } from "ics";
import { prisma } from "@/lib/prisma";
import { PRACTITIONER_NAME } from "@/lib/site-config";

// Unlike the neutral-titled .ics a client gets in their confirmation email,
// this feed is for Michelle's own calendar — she needs to actually see who
// and what, so events here are fully detailed on purpose.
export async function getOrCreateCalendarFeedToken(adminId: string): Promise<string> {
  const admin = await prisma.adminUser.findUniqueOrThrow({ where: { id: adminId } });
  if (admin.calendarFeedToken) return admin.calendarFeedToken;

  const token = nanoid(40);
  await prisma.adminUser.update({ where: { id: adminId }, data: { calendarFeedToken: token } });
  return token;
}

export async function regenerateCalendarFeedToken(adminId: string): Promise<string> {
  const token = nanoid(40);
  await prisma.adminUser.update({ where: { id: adminId }, data: { calendarFeedToken: token } });
  return token;
}

type FeedAppointment = {
  publicCode: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  format: string;
  clientName: string;
  service: { name: string };
};

export function buildCalendarFeedIcs(appointments: FeedAppointment[]): string | null {
  const events: EventAttributes[] = appointments.map((a) => ({
    title: `${a.service.name} — ${a.clientName} (${a.format === "in_person" ? "in person" : "online"})`,
    description: `Reference: ${a.publicCode}\nStatus: ${a.status}\nWith: ${PRACTITIONER_NAME}`,
    start: dateToArray(a.startsAt),
    startInputType: "utc",
    end: dateToArray(a.endsAt),
    endInputType: "utc",
    uid: `${a.publicCode}-feed@novaturientbeauty`,
    status: a.status === "cancelled_by_client" || a.status === "cancelled_by_practitioner" ? "CANCELLED" : "CONFIRMED",
  }));

  if (events.length === 0) {
    // ics requires at least one event; an empty-but-valid calendar is fine.
    const { error, value } = createEvents([], { calName: "Novaturient Beauty" });
    return error || !value ? null : value;
  }

  const { error, value } = createEvents(events, { calName: "Novaturient Beauty" });
  if (error || !value) {
    console.error("Failed to build calendar feed:", error);
    return null;
  }
  return value;
}

function dateToArray(date: Date): [number, number, number, number, number] {
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
  ];
}
