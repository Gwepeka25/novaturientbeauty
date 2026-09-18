import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  registerForWorkshop,
  cancelWorkshopRegistration,
  markWorkshopRegistrationPaidOnline,
  canManageWorkshopRegistration,
  getUpcomingWorkshopsWithSpots,
  WorkshopUnavailableError,
  WorkshopFullError,
} from "@/lib/workshops";

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.workshopRegistration.deleteMany();
  await prisma.workshop.deleteMany();
});

function makeWorkshop(overrides: Partial<{ capacity: number; active: boolean; startsAt: Date; priceCents: number }> = {}) {
  return prisma.workshop.create({
    data: {
      title: "Intro to Mindful Intimacy",
      description: "A group session.",
      startsAt: overrides.startsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endsAt: new Date((overrides.startsAt ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)).getTime() + 2 * 60 * 60 * 1000),
      format: "in_person",
      capacity: overrides.capacity ?? 3,
      priceCents: overrides.priceCents ?? 4500,
      active: overrides.active ?? true,
    },
  });
}

describe("registerForWorkshop", () => {
  it("registers a client when there's capacity", async () => {
    const workshop = await makeWorkshop({ capacity: 3 });

    const { registration } = await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee One",
      clientEmail: "attendee-one@example.com",
    });

    expect(registration.status).toBe("confirmed");
    expect(registration.workshopId).toBe(workshop.id);
  });

  it("rejects registration once capacity is reached", async () => {
    const workshop = await makeWorkshop({ capacity: 1 });
    await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee One",
      clientEmail: "attendee-one@example.com",
    });

    await expect(
      registerForWorkshop({
        workshopId: workshop.id,
        clientName: "Attendee Two",
        clientEmail: "attendee-two@example.com",
      }),
    ).rejects.toThrow(WorkshopFullError);
  });

  it("allows registration again once a spot is freed by a cancellation", async () => {
    const workshop = await makeWorkshop({ capacity: 1 });
    const { registration: first } = await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee One",
      clientEmail: "attendee-one@example.com",
    });

    await cancelWorkshopRegistration(first.id, "cancelled_by_client");

    const { registration: second } = await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee Two",
      clientEmail: "attendee-two@example.com",
    });
    expect(second.status).toBe("confirmed");
  });

  it("rejects registration for an unpublished workshop", async () => {
    const workshop = await makeWorkshop({ active: false });
    await expect(
      registerForWorkshop({
        workshopId: workshop.id,
        clientName: "Attendee One",
        clientEmail: "attendee-one@example.com",
      }),
    ).rejects.toThrow(WorkshopUnavailableError);
  });

  it("rejects registration for a workshop that has already happened", async () => {
    const workshop = await makeWorkshop({ startsAt: new Date(Date.now() - 60_000) });
    await expect(
      registerForWorkshop({
        workshopId: workshop.id,
        clientName: "Attendee One",
        clientEmail: "attendee-one@example.com",
      }),
    ).rejects.toThrow(WorkshopUnavailableError);
  });
});

describe("markWorkshopRegistrationPaidOnline", () => {
  it("is idempotent", async () => {
    const workshop = await makeWorkshop();
    const { registration } = await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee One",
      clientEmail: "attendee-one@example.com",
    });

    await markWorkshopRegistrationPaidOnline(registration.id, "cs_test_123");
    const firstPaidAt = (await prisma.workshopRegistration.findUnique({ where: { id: registration.id } }))?.paidOnlineAt;

    await markWorkshopRegistrationPaidOnline(registration.id, "cs_test_123");
    const secondPaidAt = (await prisma.workshopRegistration.findUnique({ where: { id: registration.id } }))?.paidOnlineAt;

    expect(secondPaidAt?.getTime()).toBe(firstPaidAt?.getTime());
  });
});

describe("canManageWorkshopRegistration", () => {
  it("accepts a matching, unexpired token", () => {
    const registration = { manageToken: "abc123", manageTokenExp: new Date(Date.now() + 60_000) };
    expect(canManageWorkshopRegistration(registration, "abc123")).toBe(true);
  });

  it("rejects a mismatched token", () => {
    const registration = { manageToken: "abc123", manageTokenExp: new Date(Date.now() + 60_000) };
    expect(canManageWorkshopRegistration(registration, "wrong")).toBe(false);
  });

  it("rejects an expired token", () => {
    const registration = { manageToken: "abc123", manageTokenExp: new Date(Date.now() - 60_000) };
    expect(canManageWorkshopRegistration(registration, "abc123")).toBe(false);
  });
});

describe("getUpcomingWorkshopsWithSpots", () => {
  it("computes spots remaining from confirmed registrations only", async () => {
    const workshop = await makeWorkshop({ capacity: 3 });
    const { registration } = await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee One",
      clientEmail: "attendee-one@example.com",
    });
    await registerForWorkshop({
      workshopId: workshop.id,
      clientName: "Attendee Two",
      clientEmail: "attendee-two@example.com",
    });
    await cancelWorkshopRegistration(registration.id, "cancelled_by_client");

    const upcoming = await getUpcomingWorkshopsWithSpots();
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].spotsRemaining).toBe(2);
  });

  it("excludes unpublished and past workshops", async () => {
    await makeWorkshop({ active: false });
    await makeWorkshop({ startsAt: new Date(Date.now() - 60_000) });

    const upcoming = await getUpcomingWorkshopsWithSpots();
    expect(upcoming).toHaveLength(0);
  });
});
