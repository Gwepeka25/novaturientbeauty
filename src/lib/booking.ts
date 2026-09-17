import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { isSlotStillAvailable } from "@/lib/availability";
import { nowUtc } from "@/lib/timezone";
import { acquireBookingLock } from "@/lib/db-lock";

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

  try {
    return await prisma.$transaction(
      async (tx) => {
        await acquireBookingLock(tx);

        const conflict = await tx.appointment.findFirst({
          where: {
            status: { in: ["pending", "confirmed"] },
            startsAt: { lt: endUtc },
            endsAt: { gt: input.startUtc },
          },
        });
        if (conflict) throw new SlotUnavailableError();

        const stillAvailable = await isSlotStillAvailable(input.serviceId, input.startUtc, input.format);
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
            priceCentsAtBooking: service.priceCents,
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
      },
      {
        // Generous timeout: under heavy contention for the same slot, losing
        // requests should surface as "someone else just booked this" rather
        // than a raw transaction-timeout error.
        maxWait: 10_000,
        timeout: 10_000,
      },
    );
  } catch (error) {
    if (error instanceof SlotUnavailableError) throw error;
    if (isTransactionContentionError(error)) {
      // Prisma P2028 (transaction expired/closed) or P2034 (write conflict /
      // deadlock, Postgres/CockroachDB) under heavy concurrent load for the
      // same slot. Functionally the same outcome for the caller as losing
      // the race deliberately — but log it, since sustained contention on
      // one slot is worth knowing about.
      console.warn("Booking transaction contention:", error);
      throw new SlotUnavailableError();
    }
    throw error;
  }
}

export function isTransactionContentionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    // P2028: transaction expired/closed. P2034: write conflict or deadlock
    // (Postgres/CockroachDB). P1008: socket/query timeout — on SQLite this
    // is what surfaces when several transactions queue for its single
    // writer lock at once (harmless in production: Postgres has real
    // row-level locking and doesn't serialize writers this way).
    (error.code === "P2028" || error.code === "P2034" || error.code === "P1008")
  );
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
