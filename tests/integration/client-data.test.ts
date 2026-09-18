import { describe, it, expect, beforeEach } from "vitest";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { eraseClientData, getClientDataExport } from "@/lib/client-data";

let serviceId: string;
const EMAIL = "erase-me@example.com";

beforeEach(async () => {
  await prisma.review.deleteMany();
  await prisma.reviewInvite.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.clientLoginToken.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Test session", description: "test", durationMin: 60, priceCents: 7000, format: "both" },
  });
  serviceId = service.id;
});

async function makeAppointment(overrides: { status?: string } = {}) {
  return prisma.appointment.create({
    data: {
      publicCode: `NB-${nanoid(7).toUpperCase()}`,
      serviceId,
      format: "online",
      startsAt: new Date(Date.now() - 60 * 60_000),
      endsAt: new Date(Date.now() - 30 * 60_000),
      status: overrides.status ?? "completed",
      clientName: "Erase Me",
      clientEmail: EMAIL,
      priceCentsAtBooking: 7000,
      manageToken: nanoid(32),
      manageTokenExp: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });
}

describe("getClientDataExport", () => {
  it("includes appointments, notes and any linked review", async () => {
    const appt = await makeAppointment();
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { clientNote: "prefers evenings", privateOpsNote: "always on time" },
    });
    const invite = await prisma.reviewInvite.create({
      data: { appointmentId: appt.id, token: nanoid(32), tokenExp: new Date(Date.now() + 1000) },
    });
    await prisma.review.create({
      data: { reviewInviteId: invite.id, body: "Great experience", status: "approved", consentPublic: true },
    });

    const payload = await getClientDataExport(EMAIL);

    expect(payload.email).toBe(EMAIL);
    expect(payload.appointments).toHaveLength(1);
    expect(payload.appointments[0].clientNote).toBe("prefers evenings");
    expect(payload.appointments[0].practitionerOpsNote).toBe("always on time");
    expect(payload.appointments[0].review?.body).toBe("Great experience");
  });

  it("returns an empty export for an email with no data", async () => {
    const payload = await getClientDataExport("nobody@example.com");
    expect(payload.appointments).toHaveLength(0);
  });
});

describe("eraseClientData", () => {
  it("deletes appointments, linked reviews, audit events and login tokens", async () => {
    const appt = await makeAppointment();
    const invite = await prisma.reviewInvite.create({
      data: { appointmentId: appt.id, token: nanoid(32), tokenExp: new Date(Date.now() + 1000) },
    });
    await prisma.review.create({
      data: { reviewInviteId: invite.id, body: "Great experience", status: "approved", consentPublic: true },
    });
    await prisma.auditEvent.create({
      data: { action: "appointment.created", appointmentId: appt.id },
    });
    await prisma.clientLoginToken.create({
      data: { email: EMAIL, token: nanoid(32), expiresAt: new Date(Date.now() + 1000) },
    });

    const result = await eraseClientData(EMAIL, null);

    expect(result.appointmentsDeleted).toBe(1);
    expect(await prisma.appointment.findMany({ where: { clientEmail: EMAIL } })).toHaveLength(0);
    expect(await prisma.reviewInvite.findUnique({ where: { id: invite.id } })).toBeNull();
    expect(await prisma.review.findMany()).toHaveLength(0);
    expect(await prisma.clientLoginToken.findMany({ where: { email: EMAIL } })).toHaveLength(0);
    expect(await prisma.auditEvent.findMany({ where: { appointmentId: appt.id } })).toHaveLength(0);
  });

  it("leaves an audit record naming the erasure itself", async () => {
    await makeAppointment();

    await eraseClientData(EMAIL, null);

    const record = await prisma.auditEvent.findFirst({ where: { action: "client.data_erased" } });
    expect(record).not.toBeNull();
    expect(JSON.parse(record!.metadata!)).toMatchObject({ email: EMAIL, appointmentsDeleted: 1 });
  });

  it("is a no-op for an email with no appointments", async () => {
    const result = await eraseClientData("nobody@example.com", null);
    expect(result.appointmentsDeleted).toBe(0);
  });
});
