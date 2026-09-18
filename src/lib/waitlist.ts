import { prisma } from "@/lib/prisma";
import { sendWaitlistJoinedEmail, sendWaitlistSlotAvailableEmail } from "@/lib/email";

export type JoinWaitlistInput = {
  serviceId: string;
  format: "in_person" | "online";
  date: string; // "YYYY-MM-DD", Europe/Brussels local date
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  note?: string;
};

export class WaitlistServiceUnavailableError extends Error {
  constructor() {
    super("That service is not available.");
  }
}

export async function joinWaitlist(input: JoinWaitlistInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) throw new WaitlistServiceUnavailableError();
  if (service.format !== "both" && service.format !== input.format) {
    throw new WaitlistServiceUnavailableError();
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      serviceId: input.serviceId,
      format: input.format,
      date: input.date,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone || null,
      note: input.note || null,
    },
  });

  // Best-effort: a confirmation email failing shouldn't fail the signup.
  try {
    await sendWaitlistJoinedEmail({
      clientEmail: entry.clientEmail,
      clientName: entry.clientName,
      serviceName: service.name,
      date: entry.date,
      format: entry.format as "in_person" | "online",
    });
  } catch (error) {
    console.error("Failed to send waitlist confirmation email:", error);
  }

  return entry;
}

/**
 * Called whenever an appointment that might have been the only thing
 * blocking a date is cancelled. Notifies every pending waitlist entry for
 * that exact service/format/date and marks them notified — best-effort per
 * entry, so one bad email address never stops the rest from being told.
 */
export async function notifyWaitlistForOpening(params: {
  serviceId: string;
  format: "in_person" | "online";
  date: string;
}) {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      serviceId: params.serviceId,
      format: params.format,
      date: params.date,
      status: "pending",
    },
    include: { service: true },
  });

  for (const entry of entries) {
    try {
      await sendWaitlistSlotAvailableEmail({
        clientEmail: entry.clientEmail,
        clientName: entry.clientName,
        serviceName: entry.service.name,
        date: entry.date,
        format: entry.format as "in_person" | "online",
      });
      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: "notified", notifiedAt: new Date() },
      });
    } catch (error) {
      console.error(`Failed to notify waitlist entry ${entry.id}:`, error);
    }
  }

  return entries.length;
}
