import { Resend } from "resend";
import { createEvent } from "ics";
import { formatLocalDateTime } from "@/lib/timezone";
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
