import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { nowUtc } from "@/lib/timezone";

const DOWNLOAD_TOKEN_TTL_DAYS = 30;

export class DigitalResourceUnavailableError extends Error {
  constructor(message = "This resource isn't available for purchase.") {
    super(message);
  }
}

export type CreatePurchaseInput = {
  resourceId: string;
  clientName: string;
  clientEmail: string;
  locale?: string;
};

/**
 * Records purchase intent — cash purchases stay locked until the admin
 * marks payment received (releasePurchase); an online payment unlocks
 * itself once Stripe confirms (markPurchasePaidOnline). Either way the
 * token exists from the start, so the admin action and the webhook can
 * share the same "does this purchase unlock the file" check.
 */
export async function createPurchase(input: CreatePurchaseInput) {
  const resource = await prisma.digitalResource.findUnique({ where: { id: input.resourceId } });
  if (!resource || !resource.active) throw new DigitalResourceUnavailableError();

  const purchase = await prisma.digitalResourcePurchase.create({
    data: {
      resourceId: input.resourceId,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      locale: input.locale ?? "en",
      downloadToken: nanoid(32),
      downloadTokenExp: new Date(Date.now() + DOWNLOAD_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { purchase, resource };
}

export function isPurchaseUnlocked(purchase: { cashPaid: boolean; paidOnlineAt: Date | null }): boolean {
  return purchase.cashPaid || !!purchase.paidOnlineAt;
}

export function isDownloadTokenValid(purchase: { downloadTokenExp: Date }): boolean {
  return purchase.downloadTokenExp > nowUtc();
}

/** Admin-triggered: marks a cash/bank-transfer purchase as paid, unlocking the download. */
export async function releasePurchase(purchaseId: string) {
  return prisma.digitalResourcePurchase.update({
    where: { id: purchaseId },
    data: { cashPaid: true },
  });
}

/**
 * Idempotent — same reasoning as markAppointmentPaidOnline. Returns the
 * newly-unlocked purchase (with its resource) only on the transition that
 * actually unlocks it, so a caller can send the download email exactly
 * once even if this runs more than once (webhook retry + return-page race).
 */
export async function markPurchasePaidOnline(purchaseId: string, stripeCheckoutSessionId: string) {
  const purchase = await prisma.digitalResourcePurchase.findUnique({
    where: { id: purchaseId },
    include: { resource: true },
  });
  if (!purchase || purchase.paidOnlineAt) return null;
  const updated = await prisma.digitalResourcePurchase.update({
    where: { id: purchaseId },
    data: { paidOnlineAt: nowUtc(), stripeCheckoutSessionId },
    include: { resource: true },
  });
  return updated;
}
