import { describe, it, expect, beforeEach } from "vitest";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { joinWaitlist, notifyWaitlistForOpening, WaitlistServiceUnavailableError } from "@/lib/waitlist";
import { setAppointmentStatus } from "@/lib/booking";
import { addDaysLocalISO, todayLocalISO, localToUtc } from "@/lib/timezone";

let serviceId: string;
const TEST_DATE = addDaysLocalISO(todayLocalISO(), 14);

beforeEach(async () => {
  await prisma.review.deleteMany();
  await prisma.reviewInvite.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Test session", description: "test", durationMin: 60, priceCents: 5000, format: "both" },
  });
  serviceId = service.id;
});

describe("joinWaitlist", () => {
  it("creates a pending entry for a valid service/format", async () => {
    const entry = await joinWaitlist({
      serviceId,
      format: "online",
      date: TEST_DATE,
      clientName: "Alex",
      clientEmail: "alex@example.com",
    });

    expect(entry.status).toBe("pending");
    expect(entry.date).toBe(TEST_DATE);
    expect(entry.format).toBe("online");
  });

  it("rejects a service that doesn't support the requested format", async () => {
    await prisma.service.update({ where: { id: serviceId }, data: { format: "online" } });

    await expect(
      joinWaitlist({
        serviceId,
        format: "in_person",
        date: TEST_DATE,
        clientName: "Alex",
        clientEmail: "alex@example.com",
      }),
    ).rejects.toBeInstanceOf(WaitlistServiceUnavailableError);
  });

  it("rejects an inactive service", async () => {
    await prisma.service.update({ where: { id: serviceId }, data: { active: false } });

    await expect(
      joinWaitlist({
        serviceId,
        format: "online",
        date: TEST_DATE,
        clientName: "Alex",
        clientEmail: "alex@example.com",
      }),
    ).rejects.toBeInstanceOf(WaitlistServiceUnavailableError);
  });
});

describe("notifyWaitlistForOpening", () => {
  it("marks matching pending entries as notified", async () => {
    const entry = await joinWaitlist({
      serviceId,
      format: "online",
      date: TEST_DATE,
      clientName: "Alex",
      clientEmail: "alex@example.com",
    });

    const count = await notifyWaitlistForOpening({ serviceId, format: "online", date: TEST_DATE });

    expect(count).toBe(1);
    const updated = await prisma.waitlistEntry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("notified");
    expect(updated?.notifiedAt).not.toBeNull();
  });

  it("leaves entries for a different date, format or service untouched", async () => {
    const otherService = await prisma.service.create({
      data: { name: "Other session", description: "test", durationMin: 60, priceCents: 5000, format: "both" },
    });

    const wrongDate = await joinWaitlist({
      serviceId,
      format: "online",
      date: addDaysLocalISO(TEST_DATE, 1),
      clientName: "Wrong date",
      clientEmail: "wrongdate@example.com",
    });
    const wrongFormat = await joinWaitlist({
      serviceId,
      format: "in_person",
      date: TEST_DATE,
      clientName: "Wrong format",
      clientEmail: "wrongformat@example.com",
    });
    const wrongService = await joinWaitlist({
      serviceId: otherService.id,
      format: "online",
      date: TEST_DATE,
      clientName: "Wrong service",
      clientEmail: "wrongservice@example.com",
    });

    await notifyWaitlistForOpening({ serviceId, format: "online", date: TEST_DATE });

    for (const entry of [wrongDate, wrongFormat, wrongService]) {
      const row = await prisma.waitlistEntry.findUnique({ where: { id: entry.id } });
      expect(row?.status).toBe("pending");
    }
  });

  it("does not re-notify an entry that's already been notified", async () => {
    const entry = await joinWaitlist({
      serviceId,
      format: "online",
      date: TEST_DATE,
      clientName: "Alex",
      clientEmail: "alex@example.com",
    });

    const firstRun = await notifyWaitlistForOpening({ serviceId, format: "online", date: TEST_DATE });
    const secondRun = await notifyWaitlistForOpening({ serviceId, format: "online", date: TEST_DATE });

    expect(firstRun).toBe(1);
    expect(secondRun).toBe(0);
    const updated = await prisma.waitlistEntry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("notified");
  });
});

describe("cancelling an appointment notifies the matching waitlist", () => {
  it("notifies a pending waitlist entry when setAppointmentStatus cancels the appointment", async () => {
    const startsAt = localToUtc(TEST_DATE, 10 * 60);
    const appointment = await prisma.appointment.create({
      data: {
        publicCode: `NB-${nanoid(7).toUpperCase()}`,
        serviceId,
        format: "online",
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000),
        status: "confirmed",
        clientName: "Booked Client",
        clientEmail: "booked@example.com",
        manageToken: nanoid(32),
        manageTokenExp: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
    const entry = await joinWaitlist({
      serviceId,
      format: "online",
      date: TEST_DATE,
      clientName: "Waiting Client",
      clientEmail: "waiting@example.com",
    });

    await setAppointmentStatus(appointment.id, "cancelled_by_practitioner");

    const updated = await prisma.waitlistEntry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("notified");
  });

  it("does not notify the waitlist when an appointment is only marked completed", async () => {
    const startsAt = localToUtc(TEST_DATE, 10 * 60);
    const appointment = await prisma.appointment.create({
      data: {
        publicCode: `NB-${nanoid(7).toUpperCase()}`,
        serviceId,
        format: "online",
        startsAt,
        endsAt: new Date(startsAt.getTime() + 60 * 60_000),
        status: "confirmed",
        clientName: "Booked Client",
        clientEmail: "booked@example.com",
        manageToken: nanoid(32),
        manageTokenExp: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });
    const entry = await joinWaitlist({
      serviceId,
      format: "online",
      date: TEST_DATE,
      clientName: "Waiting Client",
      clientEmail: "waiting@example.com",
    });

    await setAppointmentStatus(appointment.id, "completed");

    const updated = await prisma.waitlistEntry.findUnique({ where: { id: entry.id } });
    expect(updated?.status).toBe("pending");
  });
});
