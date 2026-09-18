import { prisma } from "@/lib/prisma";
import { sendAppointmentReminderEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { nowUtc, formatLocalDateTime } from "@/lib/timezone";
import { PRACTITIONER_NAME } from "@/lib/site-config";

const REMINDER_WINDOW_HOURS = 24;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Short, neutral (no service/appointment type revealed) — same discretion
// as the email reminder. Not run through the admin-editable template
// system: this is a scaffold, inactive until Twilio credentials exist.
const REMINDER_SMS_TEXT: Record<string, (when: string, manageUrl: string) => string> = {
  en: (when, url) => `Reminder: your appointment with ${PRACTITIONER_NAME} is ${when} (Brussels time). Manage: ${url}`,
  fr: (when, url) => `Rappel : votre rendez-vous avec ${PRACTITIONER_NAME} est le ${when} (heure de Bruxelles). Gérer : ${url}`,
  nl: (when, url) => `Herinnering: je afspraak met ${PRACTITIONER_NAME} is op ${when} (Brusselse tijd). Beheren: ${url}`,
};

// Finds confirmed appointments that have crossed into the "24 hours from
// now" window and haven't been reminded yet, sends the reminder, and marks
// each one so a later run never double-sends. Safe to call repeatedly and
// concurrently — the reminderSentAt write is what makes each appointment
// eligible exactly once.
export async function sendDueReminders(): Promise<number> {
  const now = nowUtc();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const due = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      reminderSentAt: null,
      startsAt: { gt: now, lte: windowEnd },
    },
  });

  let sent = 0;
  for (const appointment of due) {
    const { count } = await prisma.appointment.updateMany({
      where: { id: appointment.id, reminderSentAt: null },
      data: { reminderSentAt: now },
    });
    if (count === 0) continue; // another run already claimed it

    await sendAppointmentReminderEmail(appointment);

    // Best-effort, and only if there's a phone number on file — an SMS
    // failure should never affect the (already-sent) email reminder.
    if (appointment.clientPhone) {
      try {
        const textFor = REMINDER_SMS_TEXT[appointment.locale] ?? REMINDER_SMS_TEXT.en;
        const manageUrl = `${siteUrl}/manage/${appointment.manageToken}`;
        await sendSms(appointment.clientPhone, textFor(formatLocalDateTime(appointment.startsAt), manageUrl));
      } catch (error) {
        console.error(`Failed to send SMS reminder for appointment ${appointment.id}:`, error);
      }
    }

    sent++;
  }
  return sent;
}
