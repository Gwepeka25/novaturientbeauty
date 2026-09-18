import { describe, it, expect, beforeEach } from "vitest";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { sendDueReengagementEmails } from "@/lib/reengagement";

let serviceId: string;
const DAY_MS = 24 * 60 * 60_000;

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
  clientEmail?: string;
  reengagementSentAt?: Date | null;
}) {
  const {
    startsAt,
    status = "completed",
    clientEmail = "client@example.com",
    reengagementSentAt = null,
  } = overrides;
  return prisma.appointment.create({
    data: {
      publicCode: `NB-${nanoid(7).toUpperCase()}`,
      serviceId,
      format: "online",
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60_000),
      status,
      clientName: "Test Client",
      clientEmail,
      manageToken: nanoid(32),
      manageTokenExp: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      reengagementSentAt,
    },
  });
}

describe("sendDueReengagementEmails", () => {
  it("emails a client whose last completed session was well over 4 months ago", async () => {
    const appt = await makeAppointment({ startsAt: new Date(Date.now() - 130 * DAY_MS) });

    const sent = await sendDueReengagementEmails();

    expect(sent).toBe(1);
    const updated = await prisma.appointment.findUnique({ where: { id: appt.id } });
    expect(updated?.reengagementSentAt).not.toBeNull();
  });

  it("does not email a client whose last session was recent", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() - 10 * DAY_MS) });

    const sent = await sendDueReengagementEmails();

    expect(sent).toBe(0);
  });

  it("does not email a client who has booked again since their old completed session", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() - 130 * DAY_MS), status: "completed" });
    await makeAppointment({ startsAt: new Date(Date.now() + 5 * DAY_MS), status: "pending" });

    const sent = await sendDueReengagementEmails();

    expect(sent).toBe(0);
  });

  it("does not email a client whose last appointment was never completed", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() - 130 * DAY_MS), status: "cancelled_by_client" });

    const sent = await sendDueReengagementEmails();

    expect(sent).toBe(0);
  });

  it("never sends a second re-engagement email for the same lapse", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() - 130 * DAY_MS) });

    const firstRun = await sendDueReengagementEmails();
    const secondRun = await sendDueReengagementEmails();

    expect(firstRun).toBe(1);
    expect(secondRun).toBe(0);
  });

  it("treats different clients independently", async () => {
    await makeAppointment({ startsAt: new Date(Date.now() - 130 * DAY_MS), clientEmail: "a@example.com" });
    await makeAppointment({ startsAt: new Date(Date.now() - 130 * DAY_MS), clientEmail: "b@example.com" });

    const sent = await sendDueReengagementEmails();

    expect(sent).toBe(2);
  });
});
