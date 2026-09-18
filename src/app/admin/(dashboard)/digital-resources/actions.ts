"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { releasePurchase } from "@/lib/digital-resources";
import { sendDigitalResourceDownloadReadyEmail } from "@/lib/email";

// Kept modest for Postgres bytea storage — see prisma/schema.prisma.
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  priceEuros: z.coerce.number().min(0),
});

export async function createDigitalResource(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priceEuros: formData.get("priceEuros"),
  });
  if (!parsed.success) return;
  const data = parsed.data;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_FILE_SIZE_BYTES) return;

  const fileData = Buffer.from(await file.arrayBuffer());

  const resource = await prisma.digitalResource.create({
    data: {
      title: data.title,
      description: data.description,
      priceCents: Math.round(data.priceEuros * 100),
      fileName: file.name,
      fileMimeType: file.type || "application/octet-stream",
      fileData,
      fileSizeBytes: file.size,
    },
  });

  await prisma.auditEvent.create({
    data: {
      action: "digital_resource.created",
      actorId: session.sub,
      metadata: JSON.stringify({ resourceId: resource.id, title: data.title }),
    },
  });

  revalidatePath("/admin/digital-resources");
}

export async function unpublishDigitalResource(formData: FormData) {
  const session = await requireAdminSession();
  const resourceId = String(formData.get("resourceId"));

  await prisma.digitalResource.update({ where: { id: resourceId }, data: { active: false } });
  await prisma.auditEvent.create({
    data: { action: "digital_resource.unpublished", actorId: session.sub, metadata: JSON.stringify({ resourceId }) },
  });

  revalidatePath("/admin/digital-resources");
}

export async function releasePurchaseAsAdmin(formData: FormData) {
  const session = await requireAdminSession();
  const purchaseId = String(formData.get("purchaseId"));

  const purchase = await releasePurchase(purchaseId);
  const resource = await prisma.digitalResource.findUnique({ where: { id: purchase.resourceId } });
  if (resource) {
    await sendDigitalResourceDownloadReadyEmail({
      clientEmail: purchase.clientEmail,
      clientName: purchase.clientName,
      resourceTitle: resource.title,
      downloadToken: purchase.downloadToken,
      locale: purchase.locale,
    }).catch((error) => {
      console.error("Failed to send digital resource download email:", error);
    });
  }

  await prisma.auditEvent.create({
    data: { action: "digital_resource_purchase.released", actorId: session.sub, metadata: JSON.stringify({ purchaseId }) },
  });

  revalidatePath("/admin/digital-resources");
}
