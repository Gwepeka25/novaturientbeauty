/**
 * Compiled-in default subject/body for every outgoing email, plus the pure
 * {{variable}} substitution used to render one. Mirrors the WebsiteContent /
 * content-defaults.ts split: this file has no Prisma dependency, so it's
 * unit-testable on its own — src/lib/email-templates.ts is the thin
 * DB-fetching wrapper that decides default vs. an admin's approved edit.
 *
 * Every send* function in src/lib/email.ts always adds `brandName` to the
 * variables it substitutes, so it doesn't need to be listed per template.
 * A placeholder with no matching variable is left in the output untouched
 * (rather than silently blanked), so a typo'd {{varName}} in an edited
 * template is obvious in the sent email instead of just vanishing.
 */

export type EmailTemplateKey =
  | "booking_confirmation"
  | "appointment_reminder"
  | "receipt"
  | "admin_booking_notification"
  | "review_invite"
  | "client_portal_link"
  | "waitlist_joined"
  | "waitlist_slot_available"
  | "reengagement";

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  "booking_confirmation",
  "appointment_reminder",
  "receipt",
  "admin_booking_notification",
  "review_invite",
  "client_portal_link",
  "waitlist_joined",
  "waitlist_slot_available",
  "reengagement",
];

export type EmailTemplate = { subject: string; bodyHtml: string };

export type EmailTemplateDefault = EmailTemplate & {
  label: string;
  description: string;
  variables: string[];
};

export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateKey, EmailTemplateDefault> = {
  booking_confirmation: {
    label: "Booking confirmation",
    description: "Sent to the client immediately after they book.",
    variables: ["clientName", "appointmentDateTime", "publicCode", "manageUrl"],
    subject: "Your appointment confirmation",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Your appointment is confirmed for {{appointmentDateTime}} (Brussels time).</p>
<p>Reference: {{publicCode}}</p>
<p>You can view, reschedule or cancel your appointment here: <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>Payment is by cash for in-person sessions. If your session is online, the meeting link and any payment arrangement will be confirmed here closer to your appointment.</p>
<p>See you soon.</p>
<p>— {{brandName}}</p>`,
  },
  appointment_reminder: {
    label: "Day-before reminder",
    description: "Sent automatically about 24 hours before a confirmed appointment.",
    variables: ["clientName", "appointmentDateTime", "publicCode", "manageUrl"],
    subject: "Reminder: your appointment tomorrow",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>A reminder that your appointment is tomorrow, {{appointmentDateTime}} (Brussels time).</p>
<p>Reference: {{publicCode}}</p>
<p>Need to reschedule or cancel? <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>See you soon.</p>
<p>— {{brandName}}</p>`,
  },
  receipt: {
    label: "Session receipt",
    description: "Sent automatically once a session is marked completed.",
    variables: [
      "clientName",
      "appointmentDateTime",
      "practitionerFull",
      "serviceName",
      "durationMin",
      "formatLabel",
      "paymentMethod",
      "amount",
      "publicCode",
    ],
    subject: "Your session receipt",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Here's your receipt for the session on {{appointmentDateTime}} (Brussels time).</p>
<table cellpadding="4" cellspacing="0">
  <tr><td>Practitioner</td><td>{{practitionerFull}}</td></tr>
  <tr><td>Session</td><td>{{serviceName}}</td></tr>
  <tr><td>Duration</td><td>{{durationMin}} minutes</td></tr>
  <tr><td>Format</td><td>{{formatLabel}}</td></tr>
  <tr><td>Payment method</td><td>{{paymentMethod}}</td></tr>
  <tr><td>Amount</td><td>{{amount}}</td></tr>
  <tr><td>Reference</td><td>{{publicCode}}</td></tr>
</table>
<p>— {{brandName}}</p>`,
  },
  admin_booking_notification: {
    label: "New-booking notification (to you)",
    description: "Sent to your own inbox for every new booking — deliberately detailed, unlike the client-facing emails.",
    variables: [
      "appointmentDateTime",
      "serviceName",
      "formatLabel",
      "clientName",
      "clientContact",
      "clientNote",
      "publicCode",
      "adminUrl",
    ],
    subject: "New booking: {{appointmentDateTime}}",
    bodyHtml: `<p>New booking received.</p>
<ul>
  <li><strong>When:</strong> {{appointmentDateTime}} (Brussels time)</li>
  <li><strong>Service:</strong> {{serviceName}}</li>
  <li><strong>Format:</strong> {{formatLabel}}</li>
  <li><strong>Client:</strong> {{clientName}} — {{clientContact}}</li>
  <li><strong>Note from client:</strong> {{clientNote}}</li>
  <li><strong>Reference:</strong> {{publicCode}}</li>
</ul>
<p><a href="{{adminUrl}}">View in the admin dashboard</a></p>`,
  },
  review_invite: {
    label: "Review invite",
    description: "Sent alongside the receipt when a session is marked completed.",
    variables: ["clientName", "reviewUrl"],
    subject: "A quick follow-up",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Thank you for your recent appointment. If you'd like to, you can leave a private review here — you choose whether it's published, and how you're identified.</p>
<p><a href="{{reviewUrl}}">{{reviewUrl}}</a></p>
<p>This link is single-use and will expire after 30 days.</p>
<p>— {{brandName}}</p>`,
  },
  client_portal_link: {
    label: "Client portal login link",
    description: "Sent when a client requests a passwordless link to their portal.",
    variables: ["portalUrl"],
    subject: "Your client portal link",
    bodyHtml: `<p>Hi,</p>
<p>Use this secure link to view your appointment history and download session receipts:</p>
<p><a href="{{portalUrl}}">{{portalUrl}}</a></p>
<p>This link is single-use and expires in 30 minutes. If you didn't request it, you can safely ignore this email.</p>
<p>— {{brandName}}</p>`,
  },
  waitlist_joined: {
    label: "Waitlist confirmation",
    description: "Sent when a client joins the waitlist for a fully-booked date.",
    variables: ["clientName", "serviceName", "formatLabel", "dateLabel", "bookUrl"],
    subject: "You're on the waitlist",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>You're on the waitlist for {{serviceName}} ({{formatLabel}}) on {{dateLabel}}. If a time opens up on that date, we'll email you straight away so you can book it.</p>
<p>In the meantime, you're welcome to book any other available date here: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  waitlist_slot_available: {
    label: "Waitlist slot opened up",
    description: "Sent when an appointment is cancelled and a waitlisted client can now book it.",
    variables: ["clientName", "serviceName", "formatLabel", "dateLabel", "bookUrl"],
    subject: "A time just opened up",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Good news — a time just opened up for {{serviceName}} ({{formatLabel}}) on {{dateLabel}}.</p>
<p>Slots are first-come, first-served, so it's worth booking soon: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  reengagement: {
    label: "Re-engagement (lapsed client)",
    description: "Sent automatically to clients who haven't booked in a while.",
    variables: ["clientName", "bookUrl"],
    subject: "It's been a while",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>It's been a while since your last session — we just wanted to say the door's still open whenever you'd like to come back.</p>
<p>You can book a time here, whenever suits: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
};

/** Substitutes {{name}} tokens; a name with no matching variable is left untouched. */
export function renderEmailTemplate(template: EmailTemplate, vars: Record<string, string>): EmailTemplate {
  return {
    subject: substitute(template.subject, vars),
    bodyHtml: substitute(template.bodyHtml, vars),
  };
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}
