"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { createReviewInvite } from "@/lib/reviews";

const STATUS_VALUES = ["pending", "approved", "hidden", "rejected", "withdrawn"] as const;

export async function updateReviewStatus(reviewId: string, status: string) {
  await requireAdminSession();
  const parsed = z.enum(STATUS_VALUES).safeParse(status);
  if (!parsed.success) return;
  await prisma.review.update({ where: { id: reviewId }, data: { status: parsed.data } });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}

export async function updateLegacyTestimonial(formData: FormData) {
  await requireAdminSession();
  const id = String(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!body) return;
  await prisma.review.update({ where: { id }, data: { body, displayName } });
  revalidatePath("/admin/reviews");
  revalidatePath("/reviews");
  revalidatePath("/");
}

export async function sendManualReviewInvite(formData: FormData) {
  await requireAdminSession();
  const appointmentId = String(formData.get("appointmentId") ?? "");
  if (!appointmentId) return;
  await createReviewInvite(appointmentId);
  revalidatePath("/admin/reviews");
}
