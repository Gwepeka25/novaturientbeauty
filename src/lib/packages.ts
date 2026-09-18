import { prisma } from "@/lib/prisma";

/**
 * Session packages exist purely as admin-recorded bookkeeping — this site
 * takes no online payments, so a package is created after Michelle has
 * already been paid in cash or by bank transfer (see src/lib/finance-export.ts
 * for how a package sale shows up as revenue on the Finances CSV export).
 * Booking automatically consumes a session from a matching, still-eligible
 * package; cancelling gives it back. See src/lib/booking.ts and
 * src/app/api/manage/[token]/cancel/route.ts for where that happens.
 */

export type EligiblePackage = { id: string; totalSessions: number; usedSessions: number };

/** Finds the oldest active, not-yet-exhausted package covering this client/service, if any. */
export async function findEligiblePackage(
  clientEmail: string,
  serviceId: string,
): Promise<EligiblePackage | null> {
  const packages = await prisma.package.findMany({
    where: {
      clientEmail,
      active: true,
      OR: [{ serviceId: null }, { serviceId }],
    },
    orderBy: { purchasedAt: "asc" },
  });
  return packages.find((p) => p.usedSessions < p.totalSessions) ?? null;
}

export type ActivePackageForClient = {
  id: string;
  serviceName: string | null;
  totalSessions: number;
  usedSessions: number;
};

/** Packages with sessions remaining, for display in the client portal. */
export async function getActivePackagesForClient(clientEmail: string): Promise<ActivePackageForClient[]> {
  const packages = await prisma.package.findMany({
    where: { clientEmail, active: true },
    include: { service: true },
    orderBy: { purchasedAt: "asc" },
  });
  return packages
    .filter((p) => p.usedSessions < p.totalSessions)
    .map((p) => ({
      id: p.id,
      serviceName: p.service?.name ?? null,
      totalSessions: p.totalSessions,
      usedSessions: p.usedSessions,
    }));
}

/** Gives a consumed session back to its package — called when a package-covered appointment is cancelled. */
export async function releasePackageSession(packageId: string): Promise<void> {
  await prisma.package.updateMany({
    where: { id: packageId, usedSessions: { gt: 0 } },
    data: { usedSessions: { decrement: 1 } },
  });
}
