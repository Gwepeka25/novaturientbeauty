import { prisma } from "@/lib/prisma";
import {
  CONTENT_DEFAULTS,
  CONTENT_DEFAULTS_FR,
  CONTENT_DEFAULTS_NL,
  type ContentKey,
} from "@/lib/content-defaults";

function translatedDefault(key: ContentKey, locale: string): string | undefined {
  if (locale === "fr") return CONTENT_DEFAULTS_FR[key];
  if (locale === "nl") return CONTENT_DEFAULTS_NL[key];
  return undefined;
}

/**
 * Reads editable website copy for a locale. Each (key, locale) pair is its
 * own row in WebsiteContent — /admin/content can edit and approve any of
 * them, for any locale. Fallback chain per key:
 *   1. An approved row for this exact (key, locale) — an admin's own edit.
 *   2. The compiled-in translation (src/lib/content-defaults.ts), for keys
 *      translated so far.
 *   3. The English value (its own approved row, or the English default) —
 *      so a key with no translation yet (contact details, credentials,
 *      legal drafts) still shows something real rather than blank, and a
 *      real edit (e.g. the actual contact email) shows for every language.
 */
export async function getContent(key: ContentKey, locale = "en"): Promise<string> {
  return (await getContentMany([key], locale))[key];
}

export async function getContentMany(
  keys: ContentKey[],
  locale = "en",
): Promise<Record<string, string>> {
  const rows = await prisma.websiteContent.findMany({ where: { key: { in: keys }, locale } });
  const approved = new Map(rows.filter((r) => r.approved).map((r) => [r.key, r.value]));

  const result: Record<string, string> = {};
  const needsFallback: ContentKey[] = [];
  for (const key of keys) {
    if (approved.has(key)) result[key] = approved.get(key)!;
    else needsFallback.push(key);
  }
  if (needsFallback.length === 0) return result;

  if (locale === "en") {
    for (const key of needsFallback) result[key] = CONTENT_DEFAULTS[key];
    return result;
  }

  const needsEnglish: ContentKey[] = [];
  for (const key of needsFallback) {
    const translated = translatedDefault(key, locale);
    if (translated) result[key] = translated;
    else needsEnglish.push(key);
  }
  if (needsEnglish.length > 0) {
    Object.assign(result, await getContentMany(needsEnglish, "en"));
  }
  return result;
}
