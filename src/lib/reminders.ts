import { prisma } from "@/lib/prisma";
import { sendAppointmentReminderEmail } from "@/lib/email";
import { nowUtc } from "@/lib/timezone";

const REMINDER_WINDOW_HOURS = 24;

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
    sent++;
  }
  return sent;
}
