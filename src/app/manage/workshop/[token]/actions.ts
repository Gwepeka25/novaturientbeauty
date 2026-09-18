"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canManageWorkshopRegistration, cancelWorkshopRegistration } from "@/lib/workshops";

export async function cancelMyWorkshopRegistration(formData: FormData) {
  const token = String(formData.get("token"));
  const registration = await prisma.workshopRegistration.findUnique({ where: { manageToken: token } });
  if (!registration || !canManageWorkshopRegistration(registration, token)) return;
  if (registration.status !== "confirmed") return;

  await cancelWorkshopRegistration(registration.id, "cancelled_by_client");
  revalidatePath(`/manage/workshop/${token}`);
}
