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
 * Reads editable website copy. The admin panel only edits the English
 * ("en") row for each key, so a non-English request first tries a
 * compiled-in translation (src/lib/content-defaults.ts); for keys that
 * aren't translated yet (contact details, credentials, legal drafts) it
 * falls back to the current English value instead — so Michelle's real
 * edits (e.g. her actual contact email) still show for every language,
 * rather than every non-English visitor seeing the English placeholder
 * forever. Falls back to the compiled English default when nothing is
 * approved yet, so the site never shows blank/broken copy.
 */
export async function getContent(key: ContentKey, locale = "en"): Promise<string> {
  if (locale !== "en") {
    const translated = translatedDefault(key, locale);
    if (translated) return translated;
    return getContent(key, "en");
  }
  const row = await prisma.websiteContent.findUnique({
    where: { key_locale: { key, locale } },
  });
  return row?.approved ? row.value : CONTENT_DEFAULTS[key];
}

export async function getContentMany(
  keys: ContentKey[],
  locale = "en",
): Promise<Record<string, string>> {
  if (locale !== "en") {
    const untranslated: ContentKey[] = [];
    const result: Record<string, string> = {};
    for (const key of keys) {
      const translated = translatedDefault(key, locale);
      if (translated) result[key] = translated;
      else untranslated.push(key);
    }
    if (untranslated.length > 0) {
      Object.assign(result, await getContentMany(untranslated, "en"));
    }
    return result;
  }

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
