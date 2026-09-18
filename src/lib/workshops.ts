import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { nowUtc } from "@/lib/timezone";
import { acquireWorkshopRegistrationLock } from "@/lib/db-lock";

const MANAGE_TOKEN_TTL_DAYS = 90;

export class WorkshopUnavailableError extends Error {
  constructor(message = "This workshop isn't open for registration.") {
    super(message);
  }
}

export class WorkshopFullError extends Error {
  constructor() {
    super("This workshop is fully booked.");
  }
}

export type RegisterForWorkshopInput = {
  workshopId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  locale?: string;
};

export async function registerForWorkshop(input: RegisterForWorkshopInput) {
  const manageToken = nanoid(32);
  const manageTokenExp = new Date(Date.now() + MANAGE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    // Same reasoning as booking.ts's acquireBookingLock: "count confirmed
    // registrations, then insert if under capacity" is a race under
    // concurrent registrations without serializing writers first.
    await acquireWorkshopRegistrationLock(tx);

    const workshop = await tx.workshop.findUnique({ where: { id: input.workshopId } });
    if (!workshop || !workshop.active || workshop.startsAt < nowUtc()) {
      throw new WorkshopUnavailableError();
    }

    const confirmedCount = await tx.workshopRegistration.count({
      where: { workshopId: input.workshopId, status: "confirmed" },
    });
    if (confirmedCount >= workshop.capacity) {
      throw new WorkshopFullError();
    }

    const registration = await tx.workshopRegistration.create({
      data: {
        workshopId: input.workshopId,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone || null,
        locale: input.locale ?? "en",
        manageToken,
        manageTokenExp,
      },
    });

    return { registration, workshop };
  });
}

/** Idempotent — same reasoning as booking.ts's markAppointmentPaidOnline. */
export async function markWorkshopRegistrationPaidOnline(registrationId: string, stripeCheckoutSessionId: string) {
  const registration = await prisma.workshopRegistration.findUnique({ where: { id: registrationId } });
  if (!registration || registration.paidOnlineAt) return;
  await prisma.workshopRegistration.update({
    where: { id: registrationId },
    data: { paidOnlineAt: nowUtc(), stripeCheckoutSessionId },
  });
}

export async function cancelWorkshopRegistration(registrationId: string, status: "cancelled_by_client" | "cancelled_by_practitioner") {
  return prisma.workshopRegistration.update({
    where: { id: registrationId },
    data: { status },
  });
}

export function canManageWorkshopRegistration(
  registration: { manageToken: string; manageTokenExp: Date },
  token: string,
): boolean {
  return registration.manageToken === token && registration.manageTokenExp > nowUtc();
}

export async function getUpcomingWorkshopsWithSpots() {
  const workshops = await prisma.workshop.findMany({
    where: { active: true, startsAt: { gte: nowUtc() } },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { registrations: { where: { status: "confirmed" } } } } },
  });
  return workshops.map((w) => ({
    ...w,
    spotsRemaining: Math.max(0, w.capacity - w._count.registrations),
  }));
}
