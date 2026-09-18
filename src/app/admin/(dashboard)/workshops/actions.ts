"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { cancelWorkshopRegistration } from "@/lib/workshops";
import { localToUtc } from "@/lib/timezone";

function parseTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  format: z.enum(["in_person", "online"]),
  location: z.string().trim().max(300).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1),
  priceEuros: z.coerce.number().min(0),
});

export async function createWorkshop(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    format: formData.get("format"),
    location: formData.get("location"),
    capacity: formData.get("capacity"),
    priceEuros: formData.get("priceEuros"),
  });
  if (!parsed.success) return;
  const data = parsed.data;

  const startsAt = localToUtc(data.date, parseTimeToMinutes(data.startTime));
  const endsAt = localToUtc(data.date, parseTimeToMinutes(data.endTime));
  if (endsAt <= startsAt) return;

  const workshop = await prisma.workshop.create({
    data: {
      title: data.title,
      description: data.description,
      startsAt,
      endsAt,
      format: data.format,
      location: data.location || null,
      capacity: data.capacity,
      priceCents: Math.round(data.priceEuros * 100),
    },
  });

  await prisma.auditEvent.create({
    data: {
      action: "workshop.created",
      actorId: session.sub,
      metadata: JSON.stringify({ workshopId: workshop.id, title: data.title }),
    },
  });

  revalidatePath("/admin/workshops");
}

export async function unpublishWorkshop(formData: FormData) {
  const session = await requireAdminSession();
  const workshopId = String(formData.get("workshopId"));

  await prisma.workshop.update({ where: { id: workshopId }, data: { active: false } });
  await prisma.auditEvent.create({
    data: { action: "workshop.unpublished", actorId: session.sub, metadata: JSON.stringify({ workshopId }) },
  });

  revalidatePath("/admin/workshops");
}

export async function toggleRegistrationCashPaid(formData: FormData) {
  await requireAdminSession();
  const registrationId = String(formData.get("registrationId"));
  const cashPaid = formData.get("cashPaid") === "true";

  await prisma.workshopRegistration.update({ where: { id: registrationId }, data: { cashPaid } });
  revalidatePath("/admin/workshops");
}

export async function cancelRegistrationAsAdmin(formData: FormData) {
  const session = await requireAdminSession();
  const registrationId = String(formData.get("registrationId"));

  await cancelWorkshopRegistration(registrationId, "cancelled_by_practitioner");
  await prisma.auditEvent.create({
    data: {
      action: "workshop_registration.cancelled",
      actorId: session.sub,
      metadata: JSON.stringify({ registrationId }),
    },
  });

  revalidatePath("/admin/workshops");
}
