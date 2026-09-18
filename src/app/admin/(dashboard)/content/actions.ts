"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import type { ContentKey } from "@/lib/content-defaults";
import { LOCALES } from "@/lib/i18n";

export async function updateContent(formData: FormData) {
  await requireAdminSession();
  const key = String(formData.get("key")) as ContentKey;
  const localeRaw = String(formData.get("locale") ?? "en");
  const locale = (LOCALES as readonly string[]).includes(localeRaw) ? localeRaw : "en";
  const value = String(formData.get("value") ?? "");
  const approved = formData.get("approved") === "on";

  await prisma.websiteContent.upsert({
    where: { key_locale: { key, locale } },
    update: { value, approved },
    create: { key, locale, value, approved },
  });

  revalidatePath("/admin/content");
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/sessions");
  revalidatePath("/contact");
}
