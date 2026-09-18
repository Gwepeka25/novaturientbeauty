import { prisma } from "@/lib/prisma";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULTS_FR,
  EMAIL_TEMPLATE_DEFAULTS_NL,
  type EmailTemplate,
  type EmailTemplateKey,
} from "@/lib/email-template-defaults";

function translatedDefault(key: EmailTemplateKey, locale: string): EmailTemplate | undefined {
  if (locale === "fr") return EMAIL_TEMPLATE_DEFAULTS_FR[key];
  if (locale === "nl") return EMAIL_TEMPLATE_DEFAULTS_NL[key];
  return undefined;
}

/**
 * Reads an editable email template for a locale. Fallback chain, same
 * approve-to-publish shape as src/lib/content.ts:
 *   1. An approved (key, locale) row — an admin's own edit.
 *   2. The compiled-in translation, for templates translated so far.
 *   3. The English template (its own approved row, or the English default).
 *
 * Note: every send* function in src/lib/email.ts currently calls this with
 * locale "en" — appointments don't yet record which language a client
 * booked in, so this is wired up for admin preview/editing only, not for
 * automatically sending in a client's chosen language.
 */
export async function getEmailTemplate(key: EmailTemplateKey, locale = "en"): Promise<EmailTemplate> {
  const row = await prisma.emailTemplate.findUnique({ where: { key_locale: { key, locale } } });
  if (row?.approved) return { subject: row.subject, bodyHtml: row.bodyHtml };
  if (locale === "en") return EMAIL_TEMPLATE_DEFAULTS[key];
  return translatedDefault(key, locale) ?? (await getEmailTemplate(key, "en"));
}
