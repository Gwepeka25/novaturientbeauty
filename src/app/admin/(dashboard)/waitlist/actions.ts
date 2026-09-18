"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

export async function removeWaitlistEntry(entryId: string) {
  await requireAdminSession();
  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: "cancelled" },
  });
  revalidatePath("/admin/waitlist");
}
