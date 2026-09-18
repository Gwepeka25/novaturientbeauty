import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAppointment } from "@/lib/booking";
import { setAppointmentStatus } from "@/lib/booking";
import { findEligiblePackage, getActivePackagesForClient, releasePackageSession } from "@/lib/packages";
import { addDaysLocalISO, todayLocalISO, localToUtc } from "@/lib/timezone";

let serviceId: string;
let otherServiceId: string;
const EMAIL = "package-client@example.com";
const TEST_DATE = addDaysLocalISO(todayLocalISO(), 14);

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.package.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Individual session", description: "test", durationMin: 60, priceCents: 7000, format: "both" },
  });
  serviceId = service.id;
  const other = await prisma.service.create({
    data: { name: "Couple session", description: "test", durationMin: 90, priceCents: 12000, format: "both" },
  });
  otherServiceId = other.id;
});

function makePackage(overrides: Partial<{ serviceId: string | null; totalSessions: number; usedSessions: number; active: boolean }> = {}) {
  return prisma.package.create({
    data: {
      clientEmail: EMAIL,
      clientName: "Package Client",
      serviceId: overrides.serviceId ?? serviceId,
      totalSessions: overrides.totalSessions ?? 5,
      usedSessions: overrides.usedSessions ?? 0,
      priceCentsPaid: 30000,
      active: overrides.active ?? true,
    },
  });
}

describe("findEligiblePackage", () => {
  it("finds a package matching the exact service", async () => {
    const pkg = await makePackage();
    const found = await findEligiblePackage(EMAIL, serviceId);
    expect(found?.id).toBe(pkg.id);
  });

  it("finds a generic any-service package", async () => {
    const pkg = await makePackage({ serviceId: null });
    const found = await findEligiblePackage(EMAIL, serviceId);
    expect(found?.id).toBe(pkg.id);
  });

  it("ignores a package for a different service", async () => {
    await makePackage({ serviceId: otherServiceId });
    const found = await findEligiblePackage(EMAIL, serviceId);
    expect(found).toBeNull();
  });

  it("ignores an exhausted package", async () => {
    await makePackage({ totalSessions: 3, usedSessions: 3 });
    const found = await findEligiblePackage(EMAIL, serviceId);
    expect(found).toBeNull();
  });

  it("ignores a voided package", async () => {
    await makePackage({ active: false });
    const found = await findEligiblePackage(EMAIL, serviceId);
    expect(found).toBeNull();
  });
});

describe("createAppointment with an eligible package", () => {
  it("auto-applies the package: sets packageId, zeroes the price, and increments usedSessions", async () => {
    const pkg = await makePackage({ totalSessions: 5, usedSessions: 1 });

    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "Package Client",
      clientEmail: EMAIL,
    });

    expect(appointment.packageId).toBe(pkg.id);
    expect(appointment.priceCentsAtBooking).toBe(0);
    const updated = await prisma.package.findUnique({ where: { id: pkg.id } });
    expect(updated?.usedSessions).toBe(2);
  });

  it("books normally (full price, no package) when the client has none", async () => {
    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "No Package Client",
      clientEmail: "no-package@example.com",
    });

    expect(appointment.packageId).toBeNull();
    expect(appointment.priceCentsAtBooking).toBe(7000);
  });
});

describe("cancelling a package-covered appointment releases the session", () => {
  it("decrements usedSessions back down via setAppointmentStatus", async () => {
    const pkg = await makePackage({ totalSessions: 5, usedSessions: 0 });
    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "Package Client",
      clientEmail: EMAIL,
    });
    expect((await prisma.package.findUnique({ where: { id: pkg.id } }))?.usedSessions).toBe(1);

    await setAppointmentStatus(appointment.id, "cancelled_by_practitioner");

    expect((await prisma.package.findUnique({ where: { id: pkg.id } }))?.usedSessions).toBe(0);
  });

  it("never releases below zero", async () => {
    const pkg = await makePackage({ totalSessions: 5, usedSessions: 0 });
    await releasePackageSession(pkg.id);
    expect((await prisma.package.findUnique({ where: { id: pkg.id } }))?.usedSessions).toBe(0);
  });
});

describe("getActivePackagesForClient", () => {
  it("returns only packages with sessions remaining", async () => {
    await makePackage({ totalSessions: 5, usedSessions: 2 });
    await makePackage({ serviceId: otherServiceId, totalSessions: 3, usedSessions: 3 });

    const active = await getActivePackagesForClient(EMAIL);

    expect(active).toHaveLength(1);
    expect(active[0].usedSessions).toBe(2);
    expect(active[0].totalSessions).toBe(5);
  });

  it("returns an empty list for a client with no packages", async () => {
    const active = await getActivePackagesForClient("nobody@example.com");
    expect(active).toEqual([]);
  });
});
