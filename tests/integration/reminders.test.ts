import { describe, it, expect, beforeEach } from "vitest";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { sendDueReminders } from "@/lib/reminders";

let serviceId: string;

beforeEach(async () => {
  await prisma.reviewInvite.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Test session", description: "test", durationMin: 60, priceCents: 5000, format: "both" },
  });
  serviceId = service.id;
});

function makeAppointment(overrides: {
  startsAt: Date;
  status?: string;
  reminderSentAt?: Date | null;
}) {
  const { startsAt, status = "confirmed", reminderSentAt = null } = overrides;
  return prisma.appointment.create({
    data: {
      publicCode: `NB-${nanoid(7).toUpperCase()}`,
      serviceId,
      format: "online",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60_000),
      status,
      clientName: "Test Client",
      clientEmail: "client@example.com",
      manageToken: nanoid(32),
      manageTokenExp: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      reminderSentAt,
    },
  });
}

describe("sendDueReminders", () => {
  it("reminds an appointment inside the 24h window and marks it sent", async () => {
    const appt = await makeAppointment({ startsAt: new Date(Date.now() + 23 * 60 * 60_000) });

    const sent = await sendDueReminders();

    expect(sent).toBe(1);
    const updated = await prisma.appointment.findUnique({ where: { id: appt.id } });
    expect(updated?.reminderSentAt).not.toBeNull();
  });

  it("does not remind an appointment further than 24h away", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() + 30 * 60 * 60_000) });

    const sent = await sendDueReminders();

    expect(sent).toBe(0);
  });

  it("does not remind a non-confirmed appointment", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() + 10 * 60 * 60_000), status: "pending" });

    const sent = await sendDueReminders();

    expect(sent).toBe(0);
  });

  it("does not remind a past appointment", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() - 60 * 60_000) });

    const sent = await sendDueReminders();

    expect(sent).toBe(0);
  });

  it("never sends a second reminder for the same appointment", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() + 12 * 60 * 60_000) });

    const firstRun = await sendDueReminders();
    const secondRun = await sendDueReminders();

    expect(firstRun).toBe(1);
    expect(secondRun).toBe(0);
  });
});
