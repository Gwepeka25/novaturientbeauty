"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import type { EmailTemplateKey } from "@/lib/email-template-defaults";
import { LOCALES } from "@/lib/i18n";

export async function updateEmailTemplate(formData: FormData) {
  await requireAdminSession();
  const key = String(formData.get("key")) as EmailTemplateKey;
  const localeRaw = String(formData.get("locale") ?? "en");
  const locale = (LOCALES as readonly string[]).includes(localeRaw) ? localeRaw : "en";
  const subject = String(formData.get("subject") ?? "");
  const bodyHtml = String(formData.get("bodyHtml") ?? "");
  const approved = formData.get("approved") === "on";

  await prisma.emailTemplate.upsert({
    where: { key_locale: { key, locale } },
    update: { subject, bodyHtml, approved },
    create: { key, locale, subject, bodyHtml, approved },
  });

  revalidatePath("/admin/email-templates");
}
