"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { generateGiftCode } from "@/lib/gift-codes";

const createSchema = z.object({
  amountEuros: z.coerce.number().min(1),
  purchaserName: z.string().trim().max(120).optional().or(z.literal("")),
  purchaserEmail: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  recipientNote: z.string().trim().max(300).optional().or(z.literal("")),
  expiresAt: z.string().trim().optional().or(z.literal("")),
});

export async function createGiftCode(formData: FormData) {
  const session = await requireAdminSession();
  const parsed = createSchema.safeParse({
    amountEuros: formData.get("amountEuros"),
    purchaserName: formData.get("purchaserName"),
    purchaserEmail: formData.get("purchaserEmail"),
    recipientNote: formData.get("recipientNote"),
    expiresAt: formData.get("expiresAt"),
  });
  if (!parsed.success) return;
  const data = parsed.data;

  // The code is generated randomly, so collisions are astronomically
  // unlikely but not impossible — retry a couple of times against the
  // unique constraint rather than letting a fluke crash the form.
  let giftCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      giftCode = await prisma.giftCode.create({
        data: {
          code: generateGiftCode(),
          amountCents: Math.round(data.amountEuros * 100),
          purchaserName: data.purchaserName || null,
          purchaserEmail: data.purchaserEmail || null,
          recipientNote: data.recipientNote || null,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        },
      });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  if (!giftCode) return;

  await prisma.auditEvent.create({
    data: {
      action: "gift_code.created",
      actorId: session.sub,
      metadata: JSON.stringify({ giftCodeId: giftCode.id, amountCents: giftCode.amountCents }),
    },
  });

  revalidatePath("/admin/gift-codes");
}

export async function voidGiftCode(formData: FormData) {
  const session = await requireAdminSession();
  const giftCodeId = String(formData.get("giftCodeId"));

  await prisma.giftCode.update({ where: { id: giftCodeId }, data: { active: false } });
  await prisma.auditEvent.create({
    data: { action: "gift_code.voided", actorId: session.sub, metadata: JSON.stringify({ giftCodeId }) },
  });

  revalidatePath("/admin/gift-codes");
}
