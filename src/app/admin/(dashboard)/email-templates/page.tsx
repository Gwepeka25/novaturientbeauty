import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  EMAIL_TEMPLATE_DEFAULTS_FR,
  EMAIL_TEMPLATE_DEFAULTS_NL,
  TRANSLATABLE_EMAIL_KEYS,
  type EmailTemplate,
  type EmailTemplateKey,
} from "@/lib/email-template-defaults";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { updateEmailTemplate } from "./actions";

const GROUPS: { title: string; keys: EmailTemplateKey[] }[] = [
  { title: "Booking & appointments", keys: ["booking_confirmation", "appointment_reminder", "receipt"] },
  { title: "Sent to you", keys: ["admin_booking_notification"] },
  { title: "Reviews & client portal", keys: ["review_invite", "client_portal_link"] },
  { title: "Waitlist", keys: ["waitlist_joined", "waitlist_slot_available"] },
  { title: "Re-engagement", keys: ["reengagement"] },
];

const COMPILED_DEFAULT: Record<Locale, Partial<Record<EmailTemplateKey, EmailTemplate>>> = {
  en: EMAIL_TEMPLATE_DEFAULTS,
  fr: EMAIL_TEMPLATE_DEFAULTS_FR,
  nl: EMAIL_TEMPLATE_DEFAULTS_NL,
};

export default async function AdminEmailTemplatesPage() {
  await requireAdminSession();
  const rows = await prisma.emailTemplate.findMany();
  const byKeyLocale = new Map(rows.map((r) => [`${r.key}:${r.locale}`, r]));

  function fieldFor(key: EmailTemplateKey, locale: Locale) {
    const row = byKeyLocale.get(`${key}:${locale}`);
    const fallback = COMPILED_DEFAULT[locale][key] ?? COMPILED_DEFAULT.en[key]!;
    return {
      subject: row?.subject ?? fallback.subject,
      bodyHtml: row?.bodyHtml ?? fallback.bodyHtml,
      approved: row?.approved ?? false,
    };
  }

  return (
    <>
      <h1 className="admin-page-title">Email templates</h1>
      <p className="admin-page-subtitle">
        Unapproved edits fall back to the default shown here, so outgoing emails never break —
        check &ldquo;Approved&rdquo; once you&rsquo;re happy with the wording. Use the{" "}
        <code>{"{{variableName}}"}</code> placeholders listed under each template exactly as
        written; anything else is left in the email as plain text, so a typo is easy to spot
        rather than silently vanishing. Where a French or Dutch version exists, expand
        &ldquo;Translations&rdquo; to review or edit what it actually says — clients who book or
        join the waitlist in that language are sent this version automatically.
      </p>

      {GROUPS.map((group) => (
        <div className="admin-card" key={group.title}>
          <h2>{group.title}</h2>
          {group.keys.map((key) => {
            const def = EMAIL_TEMPLATE_DEFAULTS[key];
            const en = fieldFor(key, "en");
            const translatable = TRANSLATABLE_EMAIL_KEYS.includes(key);
            return (
              <div
                key={key}
                style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}
              >
                <h3 style={{ marginBottom: 4 }}>{def.label}</h3>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{def.description}</p>
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, fontFamily: "monospace" }}>
                  Available: {def.variables.map((v) => `{{${v}}}`).join(", ")}, {"{{brandName}}"}
                </p>
                <form action={updateEmailTemplate}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="locale" value="en" />
                  <div className="admin-field">
                    <label>Subject</label>
                    <input type="text" name="subject" defaultValue={en.subject} />
                  </div>
                  <div className="admin-field">
                    <label>Body (HTML)</label>
                    <textarea
                      name="bodyHtml"
                      rows={10}
                      defaultValue={en.bodyHtml}
                      style={{ fontFamily: "monospace", fontSize: 13 }}
                    />
                  </div>
                  <label className="admin-row" style={{ gap: 6 }}>
                    <input type="checkbox" name="approved" defaultChecked={en.approved} />
                    Approved — use this wording
                  </label>
                  <div className="admin-form-actions">
                    <button className="admin-btn" type="submit">
                      Save
                    </button>
                  </div>
                </form>

                {translatable && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>
                      Translations (French / Dutch)
                    </summary>
                    <div style={{ marginTop: 12, display: "grid", gap: 16 }}>
                      {LOCALES.filter((l) => l !== "en").map((locale) => {
                        const field = fieldFor(key, locale);
                        return (
                          <form
                            action={updateEmailTemplate}
                            key={locale}
                            style={{ padding: 12, background: "var(--bg)", borderRadius: 10 }}
                          >
                            <input type="hidden" name="key" value={key} />
                            <input type="hidden" name="locale" value={locale} />
                            <div className="admin-field">
                              <label>{LOCALE_LABELS[locale]} subject</label>
                              <input type="text" name="subject" defaultValue={field.subject} />
                            </div>
                            <div className="admin-field">
                              <label>{LOCALE_LABELS[locale]} body (HTML)</label>
                              <textarea
                                name="bodyHtml"
                                rows={10}
                                defaultValue={field.bodyHtml}
                                style={{ fontFamily: "monospace", fontSize: 13 }}
                              />
                            </div>
                            <label className="admin-row" style={{ gap: 6 }}>
                              <input type="checkbox" name="approved" defaultChecked={field.approved} />
                              Approved — use this wording
                            </label>
                            <div className="admin-form-actions">
                              <button className="admin-btn admin-btn-outline" type="submit">
                                Save {LOCALE_LABELS[locale]}
                              </button>
                            </div>
                          </form>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
