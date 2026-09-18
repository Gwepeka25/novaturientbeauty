import { prisma } from "@/lib/prisma";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  type EmailTemplate,
  type EmailTemplateKey,
} from "@/lib/email-template-defaults";

/** Reads an editable email template: the admin's approved edit, or the compiled-in default. */
export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplate> {
  const row = await prisma.emailTemplate.findUnique({ where: { key } });
  if (row?.approved) return { subject: row.subject, bodyHtml: row.bodyHtml };
  return EMAIL_TEMPLATE_DEFAULTS[key];
}
