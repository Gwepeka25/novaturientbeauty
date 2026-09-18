"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { setAppointmentStatus, type AppointmentStatus } from "@/lib/booking";
import { createReviewInvite } from "@/lib/reviews";
import { sendReceiptEmail } from "@/lib/email";

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

  // Completing an appointment is the trigger for inviting a review and for
  // sending the client a receipt — both best-effort, since a failed email
  // should never undo an otherwise-successful status change.
  if (parsed.data === "completed") {
    await createReviewInvite(appointmentId).catch((error) => {
      console.error("Failed to create review invite:", error);
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });
    if (appointment) {
      await sendReceiptEmail({
        publicCode: appointment.publicCode,
        startsAt: appointment.startsAt,
        clientEmail: appointment.clientEmail,
        clientName: appointment.clientName,
        serviceName: appointment.service.name,
        durationMin: appointment.service.durationMin,
        format: appointment.format as "in_person" | "online",
        cashPaid: appointment.cashPaid,
        amountCents: appointment.priceCentsAtBooking ?? appointment.service.priceCents,
        currency: appointment.service.currency,
        locale: appointment.locale,
        coveredByPackage: !!appointment.packageId,
        coveredByGiftCode: !!appointment.giftCodeId,
      }).catch((error) => {
        console.error("Failed to send receipt email:", error);
      });
    }
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

export async function updateClientVisibleNote(formData: FormData) {
  const session = await requireAdminSession();
  const appointmentId = String(formData.get("appointmentId"));
  const note = String(formData.get("clientVisibleNote") ?? "").trim();

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { clientVisibleNote: note || null },
    }),
    prisma.auditEvent.create({
      data: {
        action: "appointment.client_visible_note_updated",
        appointmentId,
        actorId: session.sub,
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
