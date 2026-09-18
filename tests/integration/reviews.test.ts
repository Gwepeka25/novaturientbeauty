import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { createReviewInvite, submitReview, ReviewLinkInvalidError } from "@/lib/reviews";

let appointmentId: string;

beforeEach(async () => {
  await prisma.review.deleteMany();
  await prisma.reviewInvite.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();

  const service = await prisma.service.create({
    data: { name: "Test session", description: "test", durationMin: 60, priceCents: 5000, format: "both" },
  });
  const appointment = await prisma.appointment.create({
    data: {
      publicCode: "NB-TEST001",
      serviceId: service.id,
      format: "in_person",
      startsAt: new Date(),
      endsAt: new Date(),
      status: "completed",
      clientName: "Jamie Example",
      clientEmail: "jamie@example.com",
      manageToken: "test-manage-token",
      manageTokenExp: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  appointmentId = appointment.id;
});

describe("review invites", () => {
  it("is single-use — a second submission with the same token is rejected", async () => {
    const invite = await createReviewInvite(appointmentId);

    await submitReview({
      token: invite.token,
      body: "Wonderful experience.",
      displayNameMode: "first_name",
      consentPublic: true,
    });

    await expect(
      submitReview({
        token: invite.token,
        body: "Trying again.",
        displayNameMode: "anonymous",
        consentPublic: false,
      }),
    ).rejects.toBeInstanceOf(ReviewLinkInvalidError);

    const reviewCount = await prisma.review.count();
    expect(reviewCount).toBe(1);
  });

  it("is idempotent — calling createReviewInvite twice reuses the same invite", async () => {
    const first = await createReviewInvite(appointmentId);
    const second = await createReviewInvite(appointmentId);
    expect(second.id).toBe(first.id);

    const invites = await prisma.reviewInvite.count();
    expect(invites).toBe(1);
  });

  it("rejects submission for an expired token", async () => {
    const invite = await prisma.reviewInvite.create({
      data: {
        appointmentId,
        token: "expired-token",
        tokenExp: new Date(Date.now() - 1000),
      },
    });

    await expect(
      submitReview({
        token: invite.token,
        body: "Too late.",
        displayNameMode: "anonymous",
        consentPublic: false,
      }),
    ).rejects.toBeInstanceOf(ReviewLinkInvalidError);
  });

  it("never stores appointment type or contact details on the review itself", async () => {
    const invite = await createReviewInvite(appointmentId);
    const review = await submitReview({
      token: invite.token,
      body: "Great session.",
      displayNameMode: "anonymous",
      consentPublic: true,
    });

    const keys = Object.keys(review);
    expect(keys).not.toContain("clientEmail");
    expect(keys).not.toContain("clientPhone");
    expect(keys).not.toContain("format");
  });
});
