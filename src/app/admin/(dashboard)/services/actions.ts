"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

const serviceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  durationMin: z.coerce.number().int().min(5),
  priceCents: z.coerce.number().int().min(0),
  format: z.enum(["in_person", "online", "both"]),
  displayOrder: z.coerce.number().int(),
  active: z.coerce.boolean(),
});

export async function upsertService(formData: FormData) {
  await requireAdminSession();
  const id = formData.get("id");
  const parsed = serviceSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    durationMin: formData.get("durationMin"),
    priceCents: Math.round(Number(formData.get("priceEuros")) * 100),
    format: formData.get("format"),
    displayOrder: formData.get("displayOrder"),
    active: formData.get("active") === "on",
  });

  if (id && typeof id === "string") {
    await prisma.service.update({ where: { id }, data: parsed });
  } else {
    await prisma.service.create({ data: parsed });
  }
  revalidatePath("/admin/services");
  revalidatePath("/");
}
