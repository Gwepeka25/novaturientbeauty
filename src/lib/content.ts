import { prisma } from "@/lib/prisma";
import { CONTENT_DEFAULTS, type ContentKey } from "@/lib/content-defaults";

/**
 * Reads editable website copy. Falls back to the approved default when no
 * admin-approved override exists yet, so the site never shows blank/broken
 * copy while Michelle is still reviewing content in /admin/content.
 */
export async function getContent(key: ContentKey, locale = "en"): Promise<string> {
  const row = await prisma.websiteContent.findUnique({
    where: { key_locale: { key, locale } },
  });
  return row?.approved ? row.value : CONTENT_DEFAULTS[key];
}

export async function getContentMany(
  keys: ContentKey[],
  locale = "en",
): Promise<Record<string, string>> {
  const rows = await prisma.websiteContent.findMany({
    where: { key: { in: keys }, locale },
  });
  const overrides = new Map(rows.filter((r) => r.approved).map((r) => [r.key, r.value]));
  const result: Record<string, string> = {};
  for (const key of keys) {
    result[key] = overrides.get(key) ?? CONTENT_DEFAULTS[key];
  }
  return result;
}
