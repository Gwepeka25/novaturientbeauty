import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { CONTENT_DEFAULTS, type ContentKey } from "@/lib/content-defaults";
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
  { title: "About", keys: ["about.bio", "about.credentials"] },
  { title: "Sessions", keys: ["sessions.cash_note"] },
  { title: "Contact", keys: ["contact.address", "contact.email", "contact.phone", "contact.note"] },
  { title: "Legal (draft — needs review)", keys: ["privacy.body", "terms.body"] },
];

export default async function AdminContentPage() {
  await requireAdminSession();
  const rows = await prisma.websiteContent.findMany({ where: { locale: "en" } });
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return (
    <>
      <h1 className="admin-page-title">Website content</h1>
      <p className="admin-page-subtitle">
        Unapproved text falls back to the default shown here, so the site never breaks — check
        &ldquo;Approved&rdquo; once Michelle has confirmed the wording.
      </p>

      {GROUPS.map((group) => (
        <div className="admin-card" key={group.title}>
          <h2>{group.title}</h2>
          {group.keys.map((key) => {
            const row = byKey.get(key);
            const value = row?.value ?? CONTENT_DEFAULTS[key];
            const approved = row?.approved ?? false;
            return (
              <form
                action={updateContent}
                key={key}
                style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}
              >
                <input type="hidden" name="key" value={key} />
                <div className="admin-field">
                  <label>{key}</label>
                  <textarea name="value" defaultValue={value} rows={key.includes("body") ? 6 : 2} />
                </div>
                <label className="admin-row" style={{ gap: 6 }}>
                  <input type="checkbox" name="approved" defaultChecked={approved} />
                  Approved for the live site
                </label>
                <div className="admin-form-actions">
                  <button className="admin-btn" type="submit">
                    Save
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      ))}
    </>
  );
}
