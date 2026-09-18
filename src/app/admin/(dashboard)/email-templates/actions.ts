"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import type { EmailTemplateKey } from "@/lib/email-template-defaults";

export async function updateEmailTemplate(formData: FormData) {
  await requireAdminSession();
  const key = String(formData.get("key")) as EmailTemplateKey;
  const subject = String(formData.get("subject") ?? "");
  const bodyHtml = String(formData.get("bodyHtml") ?? "");
  const approved = formData.get("approved") === "on";

  await prisma.emailTemplate.upsert({
    where: { key },
    update: { subject, bodyHtml, approved },
    create: { key, subject, bodyHtml, approved },
  });

  revalidatePath("/admin/email-templates");
}
