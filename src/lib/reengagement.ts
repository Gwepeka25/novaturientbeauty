import { prisma } from "@/lib/prisma";
import { sendReengagementEmail } from "@/lib/email";
import { nowUtc } from "@/lib/timezone";

const LAPSED_AFTER_DAYS = 120; // ~4 months

// Finds clients whose most recent appointment of any kind was a completed
// session that happened LAPSED_AFTER_DAYS+ ago — i.e. nothing booked,
// cancelled, or rescheduled since — and sends a gentle nudge to come back.
// reengagementSentAt lives on that appointment row rather than a separate
// per-client table: if the client books again, a newer row becomes their
// most recent appointment and this one is simply never looked at again, so
// there's nothing to reset.
export async function sendDueReengagementEmails(): Promise<number> {
  const now = nowUtc();
  const cutoff = new Date(now.getTime() - LAPSED_AFTER_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.appointment.findMany({
    where: {
      status: "completed",
      reengagementSentAt: null,
      startsAt: { lte: cutoff },
    },
  });

  let sent = 0;
  for (const appointment of candidates) {
    const hasNewerAppointment = await prisma.appointment.findFirst({
      where: {
        clientEmail: appointment.clientEmail,
        startsAt: { gt: appointment.startsAt },
      },
    });
    if (hasNewerAppointment) continue; // they've been back since — not lapsed

    const { count } = await prisma.appointment.updateMany({
      where: { id: appointment.id, reengagementSentAt: null },
      data: { reengagementSentAt: now },
    });
    if (count === 0) continue; // another run already claimed it

    await sendReengagementEmail(appointment.clientEmail, appointment.clientName);
    sent++;
  }
  return sent;
}
