"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { setAppointmentStatus, type AppointmentStatus } from "@/lib/booking";
import { createReviewInvite } from "@/lib/reviews";

const STATUS_VALUES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled_by_client",
  "cancelled_by_practitioner",
  "no_show",
] as const;

export async function updateAppointmentStatus(appointmentId: string, status: string) {
  const session = await requireAdminSession();
  const parsed = z.enum(STATUS_VALUES).safeParse(status);
  if (!parsed.success) return;

  await setAppointmentStatus(appointmentId, parsed.data as AppointmentStatus, session.sub);

  // Completing an appointment is the trigger for inviting a review.
  if (parsed.data === "completed") {
    await createReviewInvite(appointmentId).catch((error) => {
      console.error("Failed to create review invite:", error);
    });
  }

  revalidatePath("/admin/appointments");
  revalidatePath("/admin");
}

export async function toggleCashPaid(appointmentId: string, cashPaid: boolean) {
  const session = await requireAdminSession();
  await prisma.$transaction([
    prisma.appointment.update({ where: { id: appointmentId }, data: { cashPaid } }),
    prisma.auditEvent.create({
      data: {
        action: "appointment.cash_paid_changed",
        appointmentId,
        actorId: session.sub,
        metadata: JSON.stringify({ cashPaid }),
      },
    }),
  ]);
  revalidatePath("/admin/appointments");
}

export async function updateOperationalNote(appointmentId: string, note: string) {
  const session = await requireAdminSession();
  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { privateOpsNote: note || null },
    }),
    prisma.auditEvent.create({
      data: {
        action: "appointment.note_updated",
        appointmentId,
        actorId: session.sub,
      },
    }),
  ]);
  revalidatePath("/admin/appointments");
}
