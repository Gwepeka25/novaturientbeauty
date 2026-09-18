import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { sendReviewInviteEmail } from "@/lib/email";

const REVIEW_TOKEN_TTL_DAYS = 30;

export async function createReviewInvite(appointmentId: string) {
  const existing = await prisma.reviewInvite.findUnique({ where: { appointmentId } });
  if (existing) return existing;

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) throw new Error("Appointment not found");

  const token = nanoid(32);
  const tokenExp = new Date(Date.now() + REVIEW_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invite = await prisma.reviewInvite.create({
    data: { appointmentId, token, tokenExp },
  });

  await sendReviewInviteEmail(appointment.clientEmail, appointment.clientName, token, appointment.locale);

  return invite;
}

export type ReviewSubmission = {
  token: string;
  body: string;
  displayNameMode: "first_name" | "initials" | "anonymous";
  consentPublic: boolean;
};

export class ReviewLinkInvalidError extends Error {
  constructor() {
    super("This review link is invalid, expired, or already used.");
  }
}

export async function submitReview(input: ReviewSubmission) {
  const invite = await prisma.reviewInvite.findUnique({
    where: { token: input.token },
    include: { appointment: true },
  });

  if (!invite || invite.usedAt || invite.tokenExp < new Date()) {
    throw new ReviewLinkInvalidError();
  }

  const displayName = resolveDisplayName(input.displayNameMode, invite.appointment.clientName);

  return prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        reviewInviteId: invite.id,
        displayNameMode: input.displayNameMode,
        displayName,
        body: input.body,
        consentPublic: input.consentPublic,
        status: "pending",
      },
    });
    await tx.reviewInvite.update({
      where: { id: invite.id },
      data: { usedAt: new Date() },
    });
    return review;
  });
}

function resolveDisplayName(
  mode: "first_name" | "initials" | "anonymous",
  clientName: string,
): string {
  const trimmed = clientName.trim();
  if (mode === "anonymous") return "Anonymous";
  if (mode === "first_name") return trimmed.split(/\s+/)[0] || "Anonymous";
  // initials
  return trimmed
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .join(".");
}
