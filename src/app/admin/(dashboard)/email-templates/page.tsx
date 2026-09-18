import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { EMAIL_TEMPLATE_DEFAULTS, type EmailTemplateKey } from "@/lib/email-template-defaults";
import { updateEmailTemplate } from "./actions";

const GROUPS: { title: string; keys: EmailTemplateKey[] }[] = [
  { title: "Booking & appointments", keys: ["booking_confirmation", "appointment_reminder", "receipt"] },
  { title: "Sent to you", keys: ["admin_booking_notification"] },
  { title: "Reviews & client portal", keys: ["review_invite", "client_portal_link"] },
  { title: "Waitlist", keys: ["waitlist_joined", "waitlist_slot_available"] },
  { title: "Re-engagement", keys: ["reengagement"] },
];

export default async function AdminEmailTemplatesPage() {
  await requireAdminSession();
  const rows = await prisma.emailTemplate.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));

  return (
    <>
      <h1 className="admin-page-title">Email templates</h1>
      <p className="admin-page-subtitle">
        Unapproved edits fall back to the default shown here, so outgoing emails never break —
        check &ldquo;Approved&rdquo; once you&rsquo;re happy with the wording. Use the{" "}
        <code>{"{{variableName}}"}</code> placeholders listed under each template exactly as
        written; anything else is left in the email as plain text, so a typo is easy to spot
        rather than silently vanishing.
      </p>

      {GROUPS.map((group) => (
        <div className="admin-card" key={group.title}>
          <h2>{group.title}</h2>
          {group.keys.map((key) => {
            const def = EMAIL_TEMPLATE_DEFAULTS[key];
            const row = byKey.get(key);
            const subject = row?.subject ?? def.subject;
            const bodyHtml = row?.bodyHtml ?? def.bodyHtml;
            const approved = row?.approved ?? false;
            return (
              <form
                action={updateEmailTemplate}
                key={key}
                style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid var(--line)" }}
              >
                <input type="hidden" name="key" value={key} />
                <h3 style={{ marginBottom: 4 }}>{def.label}</h3>
                <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{def.description}</p>
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, fontFamily: "monospace" }}>
                  Available: {def.variables.map((v) => `{{${v}}}`).join(", ")}, {"{{brandName}}"}
                </p>
                <div className="admin-field">
                  <label>Subject</label>
                  <input type="text" name="subject" defaultValue={subject} />
                </div>
                <div className="admin-field">
                  <label>Body (HTML)</label>
                  <textarea
                    name="bodyHtml"
                    rows={10}
                    defaultValue={bodyHtml}
                    style={{ fontFamily: "monospace", fontSize: 13 }}
                  />
                </div>
                <label className="admin-row" style={{ gap: 6 }}>
                  <input type="checkbox" name="approved" defaultChecked={approved} />
                  Approved — use this wording
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
