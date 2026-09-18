import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAppointment, markAppointmentPaidOnline } from "@/lib/booking";
import { addDaysLocalISO, todayLocalISO, localToUtc } from "@/lib/timezone";

let serviceId: string;
const TEST_DATE = addDaysLocalISO(todayLocalISO(), 14);

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.availabilityException.deleteMany();
  await prisma.availabilityRule.deleteMany();
  await prisma.schedulingSettings.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Individual session", description: "test", durationMin: 60, priceCents: 7000, format: "both" },
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

describe("markAppointmentPaidOnline", () => {
  it("records the Stripe session id and a paid timestamp", async () => {
    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "Online Payer",
      clientEmail: "online-payer@example.com",
    });
    expect(appointment.paidOnlineAt).toBeNull();

    await markAppointmentPaidOnline(appointment.id, "cs_test_123");

    const updated = await prisma.appointment.findUnique({ where: { id: appointment.id } });
    expect(updated?.paidOnlineAt).not.toBeNull();
    expect(updated?.stripeCheckoutSessionId).toBe("cs_test_123");
  });

  it("is idempotent — a second call (e.g. a webhook retry) doesn't overwrite the first timestamp", async () => {
    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "Online Payer",
      clientEmail: "online-payer@example.com",
    });

    await markAppointmentPaidOnline(appointment.id, "cs_test_123");
    const firstPaidAt = (await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.paidOnlineAt;

    await markAppointmentPaidOnline(appointment.id, "cs_test_123");
    const secondPaidAt = (await prisma.appointment.findUnique({ where: { id: appointment.id } }))?.paidOnlineAt;

    expect(secondPaidAt?.getTime()).toBe(firstPaidAt?.getTime());
  });

  it("does nothing for an unknown appointment id", async () => {
    await expect(markAppointmentPaidOnline("nonexistent-id", "cs_test_999")).resolves.toBeUndefined();
  });
});
