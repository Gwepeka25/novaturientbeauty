import { describe, it, expect, beforeEach } from "vitest";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requestPortalLink, verifyPortalToken } from "@/lib/portal-auth";

let serviceId: string;

beforeEach(async () => {
  await prisma.clientLoginToken.deleteMany();
  await prisma.reviewInvite.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Test session", description: "test", durationMin: 60, priceCents: 5000, format: "both" },
  });
  serviceId = service.id;
});

async function makeAppointmentFor(email: string) {
  await prisma.appointment.create({
    data: {
      publicCode: `NB-${nanoid(7).toUpperCase()}`,
      serviceId,
      format: "online",
      startsAt: new Date(Date.now() - 60 * 60_000),
      endsAt: new Date(Date.now() - 30 * 60_000),
      status: "completed",
      clientName: "Test Client",
      clientEmail: email,
      manageToken: nanoid(32),
      manageTokenExp: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });
}

describe("requestPortalLink / verifyPortalToken", () => {
  it("creates a redeemable token for a known client email", async () => {
    await makeAppointmentFor("client@example.com");
    await requestPortalLink("client@example.com", "http://localhost:3000");

    const row = await prisma.clientLoginToken.findFirst({ where: { email: "client@example.com" } });
    expect(row).not.toBeNull();

    const email = await verifyPortalToken(row!.token);
    expect(email).toBe("client@example.com");
  });

  it("does not create a token for an email with no appointments", async () => {
    await requestPortalLink("stranger@example.com", "http://localhost:3000");

    const row = await prisma.clientLoginToken.findFirst({ where: { email: "stranger@example.com" } });
    expect(row).toBeNull();
  });

  it("rejects an unknown token", async () => {
    const email = await verifyPortalToken("not-a-real-token");
    expect(email).toBeNull();
  });

  it("rejects a token that was already used", async () => {
    await makeAppointmentFor("client@example.com");
    await requestPortalLink("client@example.com", "http://localhost:3000");
    const row = await prisma.clientLoginToken.findFirst({ where: { email: "client@example.com" } });

    const first = await verifyPortalToken(row!.token);
    const second = await verifyPortalToken(row!.token);

    expect(first).toBe("client@example.com");
    expect(second).toBeNull();
  });

  it("rejects an expired token", async () => {
    await makeAppointmentFor("client@example.com");
    const token = nanoid(32);
    await prisma.clientLoginToken.create({
      data: { email: "client@example.com", token, expiresAt: new Date(Date.now() - 60_000) },
    });

    const email = await verifyPortalToken(token);
    expect(email).toBeNull();
  });
});
