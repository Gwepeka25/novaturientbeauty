import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots, isSlotStillAvailable } from "@/lib/availability";
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
    data: { name: "Test session", description: "test", durationMin: 60, priceCents: 5000, format: "both" },
  });
  serviceId = service.id;

  await prisma.schedulingSettings.create({
    data: { minNoticeMinutes: 60, maxAdvanceDays: 90, bufferBeforeMinutes: 0, bufferAfterMinutes: 15 },
  });

  for (let weekday = 0; weekday <= 6; weekday++) {
    await prisma.availabilityRule.create({
      data: { weekday, startMinute: 9 * 60, endMinute: 17 * 60 },
    });
  }
});

describe("format-restricted availability exceptions", () => {
  it("blocking in-person for the day leaves online fully available", async () => {
    await prisma.availabilityException.create({
      data: { date: TEST_DATE, kind: "block", isFullDayBlock: true, formatRestriction: "in_person" },
    });

    const inPersonSlots = await getAvailableSlots(TEST_DATE, serviceId, "in_person");
    const onlineSlots = await getAvailableSlots(TEST_DATE, serviceId, "online");

    expect(inPersonSlots).toHaveLength(0);
    expect(onlineSlots.length).toBeGreaterThan(0);
  });

  it("blocking online for the day leaves in-person fully available", async () => {
    await prisma.availabilityException.create({
      data: { date: TEST_DATE, kind: "block", isFullDayBlock: true, formatRestriction: "online" },
    });

    const inPersonSlots = await getAvailableSlots(TEST_DATE, serviceId, "in_person");
    const onlineSlots = await getAvailableSlots(TEST_DATE, serviceId, "online");

    expect(onlineSlots).toHaveLength(0);
    expect(inPersonSlots.length).toBeGreaterThan(0);
  });

  it("a block with no formatRestriction blocks both formats", async () => {
    await prisma.availabilityException.create({
      data: { date: TEST_DATE, kind: "block", isFullDayBlock: true },
    });

    const inPersonSlots = await getAvailableSlots(TEST_DATE, serviceId, "in_person");
    const onlineSlots = await getAvailableSlots(TEST_DATE, serviceId, "online");

    expect(inPersonSlots).toHaveLength(0);
    expect(onlineSlots).toHaveLength(0);
  });

  it("a partial-time in-person-only block only removes those hours from in-person", async () => {
    // Block 09:00-12:00 for in-person only.
    await prisma.availabilityException.create({
      data: {
        date: TEST_DATE,
        kind: "block",
        startMinute: 9 * 60,
        endMinute: 12 * 60,
        formatRestriction: "in_person",
      },
    });

    const inPersonSlots = await getAvailableSlots(TEST_DATE, serviceId, "in_person");
    const onlineSlots = await getAvailableSlots(TEST_DATE, serviceId, "online");

    const blockedTime = localToUtc(TEST_DATE, 10 * 60).getTime();
    expect(inPersonSlots.find((s) => s.startUtc.getTime() === blockedTime)).toBeUndefined();
    expect(onlineSlots.find((s) => s.startUtc.getTime() === blockedTime)).toBeDefined();
  });

  it("isSlotStillAvailable rejects the blocked format and accepts the other", async () => {
    await prisma.availabilityException.create({
      data: { date: TEST_DATE, kind: "block", isFullDayBlock: true, formatRestriction: "in_person" },
    });
    const startUtc = localToUtc(TEST_DATE, 10 * 60);

    expect(await isSlotStillAvailable(serviceId, startUtc, "in_person")).toBe(false);
    expect(await isSlotStillAvailable(serviceId, startUtc, "online")).toBe(true);
  });
});
