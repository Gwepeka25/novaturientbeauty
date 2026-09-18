import { Resend } from "resend";
import { createEvent } from "ics";
import { formatLocalDateTime, formatLocalDateLabel } from "@/lib/timezone";
import { formatFeeCents } from "@/lib/services-data";
import { BRAND_NAME, PRACTITIONER_NAME, PRACTITIONER_FULL } from "@/lib/site-config";
import { getEmailTemplate } from "@/lib/email-templates";
import { renderEmailTemplate, type EmailTemplateKey } from "@/lib/email-template-defaults";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const emailFrom = process.env.EMAIL_FROM ?? "no-reply@example.com";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: string }[],
) {
  const client = getResendClient();
  if (!client) {
    // No email provider configured yet (e.g. local dev). Log instead of
    // failing the booking — see docs/AGENT_BUILD_PROMPT.md section 7.
    console.log(`[email:not-configured] would send "${subject}" to ${to}`);
    return;
  }
  await client.emails.send({ from: emailFrom, to, subject, html, attachments });
}

// Every template gets this merged in automatically, so individual send*
// functions below don't need to repeat it.
function baseVars(): Record<string, string> {
  return { brandName: escapeHtml(BRAND_NAME) };
}

async function renderAndSend(
  key: EmailTemplateKey,
  to: string,
  vars: Record<string, string>,
  attachments?: { filename: string; content: string }[],
) {
  const template = await getEmailTemplate(key);
  const { subject, bodyHtml } = renderEmailTemplate(template, { ...baseVars(), ...vars });
  await sendEmail(to, subject, bodyHtml, attachments);
}

type AppointmentForEmail = {
  publicCode: string;
  startsAt: Date;
  endsAt: Date;
  manageToken: string;
  clientEmail: string;
  clientName: string;
};

export async function sendBookingConfirmationEmail(appointment: AppointmentForEmail) {
  const manageUrl = `${siteUrl}/manage/${appointment.manageToken}`;
  const ics = buildIcs(appointment);
  await renderAndSend(
    "booking_confirmation",
    appointment.clientEmail,
    {
      clientName: escapeHtml(appointment.clientName),
      appointmentDateTime: escapeHtml(formatLocalDateTime(appointment.startsAt)),
      publicCode: escapeHtml(appointment.publicCode),
      manageUrl,
    },
    ics ? [{ filename: "appointment.ics", content: Buffer.from(ics).toString("base64") }] : undefined,
  );
}

function buildIcs(appointment: AppointmentForEmail): string | null {
  const start = appointment.startsAt;
  const end = appointment.endsAt;
  const { error, value } = createEvent({
    title: `Appointment — ${PRACTITIONER_NAME}`, // neutral, no service/type revealed
    start: [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ],
    startInputType: "utc",
    end: [
      end.getUTCFullYear(),
      end.getUTCMonth() + 1,
      end.getUTCDate(),
      end.getUTCHours(),
      end.getUTCMinutes(),
    ],
    endInputType: "utc",
    uid: `${appointment.publicCode}@novaturientbeauty`,
  });
  if (error || !value) {
    console.error("Failed to build .ics file:", error);
    return null;
  }
  return value;
}

export async function sendAppointmentReminderEmail(appointment: AppointmentForEmail) {
  const manageUrl = `${siteUrl}/manage/${appointment.manageToken}`;
  await renderAndSend("appointment_reminder", appointment.clientEmail, {
    clientName: escapeHtml(appointment.clientName),
    appointmentDateTime: escapeHtml(formatLocalDateTime(appointment.startsAt)),
    publicCode: escapeHtml(appointment.publicCode),
    manageUrl,
  });
}

type CompletedAppointmentForReceipt = {
  publicCode: string;
  startsAt: Date;
  clientEmail: string;
  clientName: string;
  serviceName: string;
  durationMin: number;
  format: "in_person" | "online";
  cashPaid: boolean;
  amountCents: number;
  currency: string;
};

// Sent automatically once a session is marked completed, so the client has
// proof of payment without needing to log into the portal to see the same
// thing on the receipt page there.
export async function sendReceiptEmail(appointment: CompletedAppointmentForReceipt) {
  await renderAndSend("receipt", appointment.clientEmail, {
    clientName: escapeHtml(appointment.clientName),
    appointmentDateTime: escapeHtml(formatLocalDateTime(appointment.startsAt)),
    practitionerFull: escapeHtml(PRACTITIONER_FULL),
    serviceName: escapeHtml(appointment.serviceName),
    durationMin: String(appointment.durationMin),
    formatLabel: appointment.format === "in_person" ? "In person" : "Online",
    paymentMethod: appointment.cashPaid ? "Cash" : "Arranged privately",
    amount: escapeHtml(formatFeeCents(appointment.amountCents, appointment.currency)),
    publicCode: escapeHtml(appointment.publicCode),
  });
}

type AdminBookingNotification = {
  publicCode: string;
  startsAt: Date;
  serviceName: string;
  format: "in_person" | "online";
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  clientNote: string | null;
};

// Unlike the client-facing emails above, this one is deliberately detailed
// — Michelle needs the service/format/contact info to prepare and follow
// up, and it's her own inbox rather than a shared/visible one, so the
// neutral-subject-line discretion that protects clients doesn't apply here.
export async function sendAdminBookingNotificationEmail(
  adminEmail: string,
  appointment: AdminBookingNotification,
) {
  const clientContact = appointment.clientPhone
    ? `${appointment.clientEmail} — ${appointment.clientPhone}`
    : appointment.clientEmail;
  await renderAndSend("admin_booking_notification", adminEmail, {
    appointmentDateTime: escapeHtml(formatLocalDateTime(appointment.startsAt)),
    serviceName: escapeHtml(appointment.serviceName),
    formatLabel: appointment.format === "in_person" ? "In person" : "Online",
    clientName: escapeHtml(appointment.clientName),
    clientContact: escapeHtml(clientContact),
    clientNote: appointment.clientNote ? escapeHtml(appointment.clientNote) : "(none)",
    publicCode: escapeHtml(appointment.publicCode),
    adminUrl: `${siteUrl}/admin/appointments`,
  });
}

export async function sendReviewInviteEmail(
  clientEmail: string,
  clientName: string,
  token: string,
) {
  const reviewUrl = `${siteUrl}/reviews/write/${token}`;
  await renderAndSend("review_invite", clientEmail, {
    clientName: escapeHtml(clientName),
    reviewUrl,
  });
}

type WaitlistNotice = {
  clientEmail: string;
  clientName: string;
  serviceName: string;
  date: string; // "YYYY-MM-DD"
  format: "in_person" | "online";
};

export async function sendWaitlistJoinedEmail(entry: WaitlistNotice) {
  await renderAndSend("waitlist_joined", entry.clientEmail, {
    clientName: escapeHtml(entry.clientName),
    serviceName: escapeHtml(entry.serviceName),
    formatLabel: entry.format === "in_person" ? "in person" : "online",
    dateLabel: escapeHtml(formatLocalDateLabel(entry.date)),
    bookUrl: `${siteUrl}/book`,
  });
}

export async function sendWaitlistSlotAvailableEmail(entry: WaitlistNotice) {
  await renderAndSend("waitlist_slot_available", entry.clientEmail, {
    clientName: escapeHtml(entry.clientName),
    serviceName: escapeHtml(entry.serviceName),
    formatLabel: entry.format === "in_person" ? "in person" : "online",
    dateLabel: escapeHtml(formatLocalDateLabel(entry.date)),
    bookUrl: `${siteUrl}/book`,
  });
}

export async function sendReengagementEmail(clientEmail: string, clientName: string) {
  await renderAndSend("reengagement", clientEmail, {
    clientName: escapeHtml(clientName),
    bookUrl: `${siteUrl}/book`,
  });
}

export async function sendClientPortalLinkEmail(email: string, portalUrl: string) {
  await renderAndSend("client_portal_link", email, { portalUrl });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
