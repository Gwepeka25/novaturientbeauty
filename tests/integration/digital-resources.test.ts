import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createPurchase,
  releasePurchase,
  markPurchasePaidOnline,
  isPurchaseUnlocked,
  isDownloadTokenValid,
  DigitalResourceUnavailableError,
} from "@/lib/digital-resources";

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.digitalResourcePurchase.deleteMany();
  await prisma.digitalResource.deleteMany();
});

function makeResource(overrides: Partial<{ active: boolean; priceCents: number }> = {}) {
  return prisma.digitalResource.create({
    data: {
      title: "Intimacy Workbook",
      description: "A guided workbook.",
      priceCents: overrides.priceCents ?? 1500,
      fileName: "workbook.pdf",
      fileMimeType: "application/pdf",
      fileData: Buffer.from("test file contents"),
      fileSizeBytes: 19,
      active: overrides.active ?? true,
    },
  });
}

describe("createPurchase", () => {
  it("creates a locked purchase with a download token", async () => {
    const resource = await makeResource();

    const { purchase } = await createPurchase({
      resourceId: resource.id,
      clientName: "Reader One",
      clientEmail: "reader-one@example.com",
    });

    expect(purchase.downloadToken).toBeTruthy();
    expect(isPurchaseUnlocked(purchase)).toBe(false);
  });

  it("rejects a purchase for an unpublished resource", async () => {
    const resource = await makeResource({ active: false });
    await expect(
      createPurchase({ resourceId: resource.id, clientName: "Reader One", clientEmail: "reader-one@example.com" }),
    ).rejects.toThrow(DigitalResourceUnavailableError);
  });
});

describe("releasePurchase", () => {
  it("unlocks a cash purchase", async () => {
    const resource = await makeResource();
    const { purchase } = await createPurchase({
      resourceId: resource.id,
      clientName: "Reader One",
      clientEmail: "reader-one@example.com",
    });
    expect(isPurchaseUnlocked(purchase)).toBe(false);

    const released = await releasePurchase(purchase.id);
    expect(isPurchaseUnlocked(released)).toBe(true);
  });
});

describe("markPurchasePaidOnline", () => {
  it("unlocks the purchase and returns it with its resource on the first call", async () => {
    const resource = await makeResource();
    const { purchase } = await createPurchase({
      resourceId: resource.id,
      clientName: "Reader One",
      clientEmail: "reader-one@example.com",
    });

    const result = await markPurchasePaidOnline(purchase.id, "cs_test_123");
    expect(result?.resource.id).toBe(resource.id);
    expect(isPurchaseUnlocked(result!)).toBe(true);
  });

  it("returns null on a second call — idempotent, so the email doesn't get sent twice", async () => {
    const resource = await makeResource();
    const { purchase } = await createPurchase({
      resourceId: resource.id,
      clientName: "Reader One",
      clientEmail: "reader-one@example.com",
    });

    await markPurchasePaidOnline(purchase.id, "cs_test_123");
    const second = await markPurchasePaidOnline(purchase.id, "cs_test_123");
    expect(second).toBeNull();
  });
});

describe("isDownloadTokenValid", () => {
  it("accepts an unexpired token", () => {
    expect(isDownloadTokenValid({ downloadTokenExp: new Date(Date.now() + 60_000) })).toBe(true);
  });

  it("rejects an expired token", () => {
    expect(isDownloadTokenValid({ downloadTokenExp: new Date(Date.now() - 60_000) })).toBe(false);
  });
});

describe("isPurchaseUnlocked", () => {
  it("is unlocked when cashPaid is true", () => {
    expect(isPurchaseUnlocked({ cashPaid: true, paidOnlineAt: null })).toBe(true);
  });

  it("is unlocked when paidOnlineAt is set", () => {
    expect(isPurchaseUnlocked({ cashPaid: false, paidOnlineAt: new Date() })).toBe(true);
  });

  it("is locked when neither is set", () => {
    expect(isPurchaseUnlocked({ cashPaid: false, paidOnlineAt: null })).toBe(false);
  });
});
