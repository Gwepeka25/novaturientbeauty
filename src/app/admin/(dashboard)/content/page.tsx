import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  CONTENT_DEFAULTS,
  CONTENT_DEFAULTS_FR,
  CONTENT_DEFAULTS_NL,
  TRANSLATABLE_CONTENT_KEYS,
  type ContentKey,
} from "@/lib/content-defaults";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { updateContent } from "./actions";

const GROUPS: { title: string; keys: ContentKey[] }[] = [
  {
    title: "Homepage hero",
    keys: [
      "hero.eyebrow",
      "hero.heading",
      "hero.body",
      "hero.cta",
      "hero.secondary_cta",
      "hero.profile_tagline",
    ],
  },
  { title: "About", keys: ["about.bio", "about.credentials", "about.specialties"] },
  { title: "Sessions", keys: ["sessions.cash_note"] },
  { title: "Contact", keys: ["contact.address", "contact.email", "contact.phone", "contact.note"] },
  { title: "Legal (draft — needs review)", keys: ["privacy.body", "terms.body"] },
];

const COMPILED_DEFAULT: Record<Locale, Partial<Record<ContentKey, string>>> = {
  en: CONTENT_DEFAULTS,
  fr: CONTENT_DEFAULTS_FR,
  nl: CONTENT_DEFAULTS_NL,
};

export default async function AdminContentPage() {
  await requireAdminSession();
  const rows = await prisma.websiteContent.findMany();
  const byKeyLocale = new Map(rows.map((r) => [`${r.key}:${r.locale}`, r]));

  function fieldFor(key: ContentKey, locale: Locale) {
    const row = byKeyLocale.get(`${key}:${locale}`);
    const value = row?.value ?? COMPILED_DEFAULT[locale][key] ?? COMPILED_DEFAULT.en[key] ?? "";
    const approved = row?.approved ?? false;
    return { value, approved };
  }

  return (
    <>
      <h1 className="admin-page-title">Website content</h1>
      <p className="admin-page-subtitle">
        Unapproved text falls back to the default shown here, so the site never breaks — check
        &ldquo;Approved&rdquo; once Michelle has confirmed the wording. Where French or Dutch
        translations exist, expand &ldquo;Translations&rdquo; below a field to review or edit what
        that language actually shows.
      </p>

      {GROUPS.map((group) => (
        <div className="admin-card" key={group.title}>
          <h2>{group.title}</h2>
          {group.keys.map((key) => {
            const en = fieldFor(key, "en");
            const translatable = TRANSLATABLE_CONTENT_KEYS.includes(key);
            return (
              <div
                key={key}
                style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}
              >
                <form action={updateContent}>
                  <input type="hidden" name="key" value={key} />
                  <input type="hidden" name="locale" value="en" />
                  <div className="admin-field">
                    <label>{key}</label>
                    <textarea name="value" defaultValue={en.value} rows={key.includes("body") ? 6 : 2} />
                  </div>
                  <label className="admin-row" style={{ gap: 6 }}>
                    <input type="checkbox" name="approved" defaultChecked={en.approved} />
                    Approved for the live site
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
                            action={updateContent}
                            key={locale}
                            style={{ padding: 12, background: "var(--bg)", borderRadius: 10 }}
                          >
                            <input type="hidden" name="key" value={key} />
                            <input type="hidden" name="locale" value={locale} />
                            <div className="admin-field">
                              <label>{LOCALE_LABELS[locale]}</label>
                              <textarea
                                name="value"
                                defaultValue={field.value}
                                rows={key.includes("body") ? 6 : 2}
                              />
                            </div>
                            <label className="admin-row" style={{ gap: 6 }}>
                              <input type="checkbox" name="approved" defaultChecked={field.approved} />
                              Approved for the live site
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
