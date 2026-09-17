import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { isSlotStillAvailable } from "@/lib/availability";
import { nowUtc } from "@/lib/timezone";

export class SlotUnavailableError extends Error {
  constructor() {
    super("That time is no longer available. Please choose another.");
  }
}

const MANAGE_TOKEN_TTL_DAYS = 90;

export type CreateAppointmentInput = {
  serviceId: string;
  format: "in_person" | "online";
  startUtc: Date;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientNote?: string;
};

export async function createAppointment(input: CreateAppointmentInput) {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) throw new SlotUnavailableError();

  const endUtc = new Date(input.startUtc.getTime() + service.durationMin * 60_000);
  const publicCode = generatePublicCode();
  const manageToken = nanoid(32);
  const manageTokenExp = new Date(
    Date.now() + MANAGE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  return prisma.$transaction(async (tx) => {
    const conflict = await tx.appointment.findFirst({
      where: {
        status: { in: ["pending", "confirmed"] },
        startsAt: { lt: endUtc },
        endsAt: { gt: input.startUtc },
      },
    });
    if (conflict) throw new SlotUnavailableError();

    const stillAvailable = await isSlotStillAvailable(input.serviceId, input.startUtc);
    if (!stillAvailable) throw new SlotUnavailableError();

    const appointment = await tx.appointment.create({
      data: {
        publicCode,
        serviceId: input.serviceId,
        format: input.format,
        startsAt: input.startUtc,
        endsAt: endUtc,
        status: "confirmed",
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone || null,
        clientNote: input.clientNote || null,
        manageToken,
        manageTokenExp,
      },
    });

    await tx.auditEvent.create({
      data: {
        action: "appointment.created",
        appointmentId: appointment.id,
        metadata: JSON.stringify({ format: input.format, serviceId: input.serviceId }),
      },
    });

    return appointment;
  });
}

function generatePublicCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 7; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `NB-${code}`;
}

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled_by_client"
  | "cancelled_by_practitioner"
  | "no_show";

export async function setAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  actorId?: string,
) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.update({
      where: { id: appointmentId },
      data: { status },
    });
    await tx.auditEvent.create({
      data: {
        action: "appointment.status_changed",
        appointmentId,
        actorId: actorId ?? null,
        metadata: JSON.stringify({ status }),
      },
    });
    return appointment;
  });
}

export function canManageAppointment(appointment: {
  manageToken: string;
  manageTokenExp: Date;
}, token: string): boolean {
  return appointment.manageToken === token && appointment.manageTokenExp > nowUtc();
}
