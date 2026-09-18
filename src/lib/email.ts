import { Resend } from "resend";
import { createEvent } from "ics";
import { formatLocalDateTime, formatLocalDateLabel } from "@/lib/timezone";
import { BRAND_NAME, PRACTITIONER_NAME } from "@/lib/site-config";

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
  const html = `
    <p>Hi ${escapeHtml(appointment.clientName)},</p>
    <p>Your appointment is confirmed for ${escapeHtml(formatLocalDateTime(appointment.startsAt))} (Brussels time).</p>
    <p>Reference: ${escapeHtml(appointment.publicCode)}</p>
    <p>You can view, reschedule or cancel your appointment here: <a href="${manageUrl}">${manageUrl}</a></p>
    <p>Payment is by cash for in-person sessions. If your session is online, the meeting link and any payment arrangement will be confirmed here closer to your appointment.</p>
    <p>See you soon.</p>
    <p>— ${escapeHtml(BRAND_NAME)}</p>
  `;
  const ics = buildIcs(appointment);
  // Neutral subject line — no service/appointment type revealed.
  await sendEmail(
    appointment.clientEmail,
    "Your appointment confirmation",
    html,
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
  const html = `
    <p>Hi ${escapeHtml(appointment.clientName)},</p>
    <p>A reminder that your appointment is tomorrow, ${escapeHtml(formatLocalDateTime(appointment.startsAt))} (Brussels time).</p>
    <p>Reference: ${escapeHtml(appointment.publicCode)}</p>
    <p>Need to reschedule or cancel? <a href="${manageUrl}">${manageUrl}</a></p>
    <p>See you soon.</p>
    <p>— ${escapeHtml(BRAND_NAME)}</p>
  `;
  // Neutral subject line — no service/appointment type revealed.
  await sendEmail(appointment.clientEmail, "Reminder: your appointment tomorrow", html);
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
  const html = `
    <p>New booking received.</p>
    <ul>
      <li><strong>When:</strong> ${escapeHtml(formatLocalDateTime(appointment.startsAt))} (Brussels time)</li>
      <li><strong>Service:</strong> ${escapeHtml(appointment.serviceName)}</li>
      <li><strong>Format:</strong> ${appointment.format === "in_person" ? "In person" : "Online"}</li>
      <li><strong>Client:</strong> ${escapeHtml(appointment.clientName)} — ${escapeHtml(appointment.clientEmail)}${appointment.clientPhone ? ` — ${escapeHtml(appointment.clientPhone)}` : ""}</li>
      ${appointment.clientNote ? `<li><strong>Note from client:</strong> ${escapeHtml(appointment.clientNote)}</li>` : ""}
      <li><strong>Reference:</strong> ${escapeHtml(appointment.publicCode)}</li>
    </ul>
    <p><a href="${siteUrl}/admin/appointments">View in the admin dashboard</a></p>
  `;
  await sendEmail(adminEmail, `New booking: ${formatLocalDateTime(appointment.startsAt)}`, html);
}

export async function sendReviewInviteEmail(
  clientEmail: string,
  clientName: string,
  token: string,
) {
  const reviewUrl = `${siteUrl}/reviews/write/${token}`;
  const html = `
    <p>Hi ${escapeHtml(clientName)},</p>
    <p>Thank you for your recent appointment. If you'd like to, you can leave a private review here — you choose whether it's published, and how you're identified.</p>
    <p><a href="${reviewUrl}">${reviewUrl}</a></p>
    <p>This link is single-use and will expire after 30 days.</p>
    <p>— ${escapeHtml(BRAND_NAME)}</p>
  `;
  await sendEmail(clientEmail, "A quick follow-up", html);
}

type WaitlistNotice = {
  clientEmail: string;
  clientName: string;
  serviceName: string;
  date: string; // "YYYY-MM-DD"
  format: "in_person" | "online";
};

export async function sendWaitlistJoinedEmail(entry: WaitlistNotice) {
  const bookUrl = `${siteUrl}/book`;
  const html = `
    <p>Hi ${escapeHtml(entry.clientName)},</p>
    <p>You're on the waitlist for ${escapeHtml(entry.serviceName)} (${entry.format === "in_person" ? "in person" : "online"}) on ${escapeHtml(formatLocalDateLabel(entry.date))}. If a time opens up on that date, we'll email you straight away so you can book it.</p>
    <p>In the meantime, you're welcome to book any other available date here: <a href="${bookUrl}">${bookUrl}</a></p>
    <p>— ${escapeHtml(BRAND_NAME)}</p>
  `;
  await sendEmail(entry.clientEmail, "You're on the waitlist", html);
}

export async function sendWaitlistSlotAvailableEmail(entry: WaitlistNotice) {
  const bookUrl = `${siteUrl}/book`;
  const html = `
    <p>Hi ${escapeHtml(entry.clientName)},</p>
    <p>Good news — a time just opened up for ${escapeHtml(entry.serviceName)} (${entry.format === "in_person" ? "in person" : "online"}) on ${escapeHtml(formatLocalDateLabel(entry.date))}.</p>
    <p>Slots are first-come, first-served, so it's worth booking soon: <a href="${bookUrl}">${bookUrl}</a></p>
    <p>— ${escapeHtml(BRAND_NAME)}</p>
  `;
  await sendEmail(entry.clientEmail, "A time just opened up", html);
}

export async function sendClientPortalLinkEmail(email: string, portalUrl: string) {
  const html = `
    <p>Hi,</p>
    <p>Use this secure link to view your appointment history and download session receipts:</p>
    <p><a href="${portalUrl}">${portalUrl}</a></p>
    <p>This link is single-use and expires in 30 minutes. If you didn't request it, you can safely ignore this email.</p>
    <p>— ${escapeHtml(BRAND_NAME)}</p>
  `;
  await sendEmail(email, "Your client portal link", html);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
