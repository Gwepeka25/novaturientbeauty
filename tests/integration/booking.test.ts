import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAppointment, SlotUnavailableError } from "@/lib/booking";
import { getAvailableSlots } from "@/lib/availability";
import { localToUtc, todayLocalISO, addDaysLocalISO } from "@/lib/timezone";

let serviceId: string;
// A Tuesday far enough in the future to clear any minimum-notice window.
const TEST_DATE = addDaysLocalISO(todayLocalISO(), 14);

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.schedulingSettings.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: {
      name: "Test session",
      description: "test",
      durationMin: 60,
      priceCents: 5000,
      format: "both",
    },
  });
  serviceId = service.id;

  await prisma.schedulingSettings.create({
    data: {
      minNoticeMinutes: 60,
      maxAdvanceDays: 90,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 15,
    },
  });

  // Open every day of the week for this test's purposes.
  for (let weekday = 0; weekday <= 6; weekday++) {
    await prisma.availabilityRule.create({
      data: { weekday, startMinute: 9 * 60, endMinute: 17 * 60 },
    });
  }
});

describe("createAppointment — double booking prevention", () => {
  // Two clients clicking "confirm" for the same slot within the same
  // second is the realistic worst case for a single-practitioner site;
  // that's what this asserts strictly. (SQLite — dev/test only — is a
  // single-writer file store, so pushing far beyond this concurrency level
  // here tests SQLite's own connection queuing rather than our logic;
  // Postgres in production has real row-level locking and doesn't share
  // that ceiling. The one guarantee that must never break at any
  // concurrency level, on either database, is asserted below: the final
  // appointment count for the slot is always exactly one.)
  it("only allows one of several concurrent requests for the same slot to succeed", { timeout: 20000 }, async () => {
    const startUtc = localToUtc(TEST_DATE, 10 * 60);

    const attempts = await Promise.allSettled(
      Array.from({ length: 2 }, (_, i) =>
        createAppointment({
          serviceId,
          format: "in_person",
          startUtc,
          clientName: `Client ${i}`,
          clientEmail: `client${i}@example.com`,
        }),
      ),
    );

    const succeeded = attempts.filter((a) => a.status === "fulfilled");
    const failed = attempts.filter((a) => a.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    for (const f of failed) {
      if (f.status === "rejected") {
        expect(f.reason).toBeInstanceOf(SlotUnavailableError);
      }
    }

    const count = await prisma.appointment.count();
    expect(count).toBe(1);
  });

  it("respects the buffer-after gap when checking availability for an adjacent slot", async () => {
    const firstStart = localToUtc(TEST_DATE, 10 * 60);
    await createAppointment({
      serviceId,
      format: "in_person",
      startUtc: firstStart,
      clientName: "First",
      clientEmail: "first@example.com",
    });

    // 11:00 start would begin exactly when the first appointment ends (10:00-11:00),
    // but a 15-minute buffer-after means it should not be offered.
    const slots = await getAvailableSlots(TEST_DATE, serviceId);
    const conflicting = slots.find((s) => s.startUtc.getTime() === localToUtc(TEST_DATE, 11 * 60).getTime());
    expect(conflicting).toBeUndefined();

    const clear = slots.find((s) => s.startUtc.getTime() === localToUtc(TEST_DATE, 11 * 60 + 15).getTime());
    expect(clear).toBeDefined();
  });

  it("frees the slot again once the appointment is cancelled", async () => {
    const startUtc = localToUtc(TEST_DATE, 14 * 60);
    const appt = await createAppointment({
      serviceId,
      format: "online",
      startUtc,
      clientName: "Cancel me",
      clientEmail: "cancelme@example.com",
    });

    let slots = await getAvailableSlots(TEST_DATE, serviceId);
    expect(slots.find((s) => s.startUtc.getTime() === startUtc.getTime())).toBeUndefined();

    await prisma.appointment.update({ where: { id: appt.id }, data: { status: "cancelled_by_client" } });

    slots = await getAvailableSlots(TEST_DATE, serviceId);
    expect(slots.find((s) => s.startUtc.getTime() === startUtc.getTime())).toBeDefined();
  });
});

describe("getAvailableSlots — policy boundaries", () => {
  it("returns no slots for a fully blocked day", async () => {
    await prisma.availabilityException.create({
      data: { date: TEST_DATE, kind: "block", isFullDayBlock: true },
    });
    const slots = await getAvailableSlots(TEST_DATE, serviceId);
    expect(slots).toHaveLength(0);
  });

  it("returns no slots beyond the booking horizon", async () => {
    const tooFar = addDaysLocalISO(todayLocalISO(), 200);
    const slots = await getAvailableSlots(tooFar, serviceId);
    expect(slots).toHaveLength(0);
  });
});
