"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { regenerateCalendarFeedToken } from "@/lib/calendar-feed";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "New password must be at least 10 characters."),
});

export async function changePassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const session = await requireAdminSession();
  const parsed = schema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  if (!user) return { error: "Account not found." };

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.adminUser.update({ where: { id: user.id }, data: { passwordHash } });
  await prisma.auditEvent.create({
    data: { action: "admin.password_changed", actorId: user.id },
  });

  return { ok: true };
}

export async function regenerateCalendarFeed(): Promise<void> {
  const session = await requireAdminSession();
  await regenerateCalendarFeedToken(session.sub);
  revalidatePath("/admin/settings");
}
