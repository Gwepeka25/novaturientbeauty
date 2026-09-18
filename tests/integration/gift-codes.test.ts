import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createAppointment, GiftCodeInvalidError } from "@/lib/booking";
import { addDaysLocalISO, todayLocalISO, localToUtc } from "@/lib/timezone";

let serviceId: string;
const TEST_DATE = addDaysLocalISO(todayLocalISO(), 14);

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.giftCode.deleteMany();
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

  // Open every day of the week so TEST_DATE is always bookable regardless
  // of which weekday it lands on.
  for (let weekday = 0; weekday <= 6; weekday++) {
    await prisma.availabilityRule.create({
      data: { weekday, startMinute: 9 * 60, endMinute: 17 * 60 },
    });
  }
});

function makeGiftCode(overrides: Partial<{ code: string; amountCents: number; active: boolean; redeemedAt: Date | null; expiresAt: Date | null }> = {}) {
  return prisma.giftCode.create({
    data: {
      code: overrides.code ?? "GIFT-TEST-00001",
      amountCents: overrides.amountCents ?? 10000,
      active: overrides.active ?? true,
      redeemedAt: overrides.redeemedAt ?? null,
      expiresAt: overrides.expiresAt ?? null,
    },
  });
}

describe("createAppointment with a gift code", () => {
  it("redeems the code: sets giftCodeId, zeroes the price, and marks it redeemed", async () => {
    const gift = await makeGiftCode();

    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "Gift Client",
      clientEmail: "gift-client@example.com",
      giftCode: gift.code,
    });

    expect(appointment.giftCodeId).toBe(gift.id);
    expect(appointment.priceCentsAtBooking).toBe(0);
    const updated = await prisma.giftCode.findUnique({ where: { id: gift.id } });
    expect(updated?.redeemedAt).not.toBeNull();
  });

  it("accepts a code regardless of case or surrounding whitespace", async () => {
    const gift = await makeGiftCode({ code: "GIFT-CASE-00001" });

    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "Gift Client",
      clientEmail: "gift-client@example.com",
      giftCode: "  gift-case-00001  ",
    });

    expect(appointment.giftCodeId).toBe(gift.id);
  });

  it("rejects an unknown code", async () => {
    await expect(
      createAppointment({
        serviceId,
        format: "online",
        startUtc: localToUtc(TEST_DATE, 10 * 60),
        clientName: "Gift Client",
        clientEmail: "gift-client@example.com",
        giftCode: "GIFT-NOPE-00000",
      }),
    ).rejects.toThrow(GiftCodeInvalidError);
  });

  it("rejects an already-redeemed code", async () => {
    const gift = await makeGiftCode({ redeemedAt: new Date() });

    await expect(
      createAppointment({
        serviceId,
        format: "online",
        startUtc: localToUtc(TEST_DATE, 10 * 60),
        clientName: "Gift Client",
        clientEmail: "gift-client@example.com",
        giftCode: gift.code,
      }),
    ).rejects.toThrow(GiftCodeInvalidError);
  });

  it("rejects a voided code", async () => {
    const gift = await makeGiftCode({ active: false });

    await expect(
      createAppointment({
        serviceId,
        format: "online",
        startUtc: localToUtc(TEST_DATE, 10 * 60),
        clientName: "Gift Client",
        clientEmail: "gift-client@example.com",
        giftCode: gift.code,
      }),
    ).rejects.toThrow(GiftCodeInvalidError);
  });

  it("rejects an expired code", async () => {
    const gift = await makeGiftCode({ expiresAt: new Date(Date.now() - 60_000) });

    await expect(
      createAppointment({
        serviceId,
        format: "online",
        startUtc: localToUtc(TEST_DATE, 10 * 60),
        clientName: "Gift Client",
        clientEmail: "gift-client@example.com",
        giftCode: gift.code,
      }),
    ).rejects.toThrow(GiftCodeInvalidError);
  });

  it("rejects a code that doesn't cover the full price", async () => {
    const gift = await makeGiftCode({ amountCents: 5000 });

    await expect(
      createAppointment({
        serviceId,
        format: "online",
        startUtc: localToUtc(TEST_DATE, 10 * 60),
        clientName: "Gift Client",
        clientEmail: "gift-client@example.com",
        giftCode: gift.code,
      }),
    ).rejects.toThrow(GiftCodeInvalidError);
  });

  it("books normally (full price) when no gift code is given", async () => {
    const appointment = await createAppointment({
      serviceId,
      format: "online",
      startUtc: localToUtc(TEST_DATE, 10 * 60),
      clientName: "No Gift Client",
      clientEmail: "no-gift@example.com",
    });

    expect(appointment.giftCodeId).toBeNull();
    expect(appointment.priceCentsAtBooking).toBe(7000);
  });
});
