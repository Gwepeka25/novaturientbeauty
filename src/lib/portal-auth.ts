import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { sendClientPortalLinkEmail } from "@/lib/email";

const TOKEN_TTL_MINUTES = 30;

// Always looks and behaves the same whether or not the email has any
// appointments, so a caller (or attacker) can't use this to learn who is a
// client here — but we only actually send an email when there's someone to
// notify, so this can't be used to spam an arbitrary inbox either.
export async function requestPortalLink(email: string, siteUrl: string): Promise<void> {
  const hasAppointments = await prisma.appointment.findFirst({ where: { clientEmail: email } });
  if (!hasAppointments) return;

  const token = nanoid(32);
  await prisma.clientLoginToken.create({
    data: { email, token, expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000) },
  });
  await sendClientPortalLinkEmail(email, `${siteUrl}/portal/verify/${token}`);
}

// Single-use: returns the email on success, and burns the token whether or
// not this is the first time it's been redeemed.
export async function verifyPortalToken(token: string): Promise<string | null> {
  const row = await prisma.clientLoginToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;

  const { count } = await prisma.clientLoginToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (count === 0) return null; // lost a race with another redemption

  return row.email;
}
