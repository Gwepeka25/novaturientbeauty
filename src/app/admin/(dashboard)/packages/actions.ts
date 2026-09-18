"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

const createSchema = z.object({
  clientEmail: z.string().trim().toLowerCase().email(),
  clientName: z.string().trim().min(1),
  serviceId: z.string().trim(),
  totalSessions: z.coerce.number().int().min(1),
  priceEuros: z.coerce.number().min(0),
  note: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function createPackage(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = createSchema.safeParse({
    clientEmail: formData.get("clientEmail"),
    clientName: formData.get("clientName"),
    serviceId: formData.get("serviceId"),
    totalSessions: formData.get("totalSessions"),
    priceEuros: formData.get("priceEuros"),
    note: formData.get("note"),
  });
  if (!parsed.success) return;
  const data = parsed.data;

  const pkg = await prisma.package.create({
    data: {
      clientEmail: data.clientEmail,
      clientName: data.clientName,
      serviceId: data.serviceId || null,
      totalSessions: data.totalSessions,
      priceCentsPaid: Math.round(data.priceEuros * 100),
      note: data.note || null,
    },
  });

  await prisma.auditEvent.create({
    data: {
      action: "package.created",
      actorId: session.sub,
      metadata: JSON.stringify({ packageId: pkg.id, clientEmail: data.clientEmail, totalSessions: data.totalSessions }),
    },
  });

  revalidatePath("/admin/packages");
}

export async function voidPackage(formData: FormData) {
  const session = await requireAdminSession();
  const packageId = String(formData.get("packageId"));

  await prisma.package.update({ where: { id: packageId }, data: { active: false } });
  await prisma.auditEvent.create({
    data: { action: "package.voided", actorId: session.sub, metadata: JSON.stringify({ packageId }) },
  });

  revalidatePath("/admin/packages");
}
