import { prisma } from "@/lib/prisma";

// All personal data tied to a client email, across every table that
// references it directly or transitively (Appointment -> ReviewInvite ->
// Review; ClientLoginToken is keyed by email directly). Used for both GDPR
// export and erasure requests — see src/app/admin/(dashboard)/clients.
export async function getClientDataExport(email: string) {
  const [appointments, loginRequests] = await Promise.all([
    prisma.appointment.findMany({
      where: { clientEmail: email },
      include: { service: true, reviewInvite: { include: { review: true } } },
      orderBy: { startsAt: "desc" },
    }),
    prisma.clientLoginToken.findMany({ where: { email }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    email,
    appointments: appointments.map((a) => ({
      reference: a.publicCode,
      service: a.service.name,
      format: a.format,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
      clientName: a.clientName,
      clientPhone: a.clientPhone,
      clientNote: a.clientNote,
      // Included because it's data about this client, even though it's
      // entered by the practitioner rather than the client themselves.
      practitionerOpsNote: a.privateOpsNote,
      cashPaid: a.cashPaid,
      priceChargedCents: a.priceCentsAtBooking ?? a.service.priceCents,
      bookedAt: a.createdAt,
      review: a.reviewInvite?.review
        ? {
            body: a.reviewInvite.review.body,
            status: a.reviewInvite.review.status,
            publishedPublicly: a.reviewInvite.review.consentPublic,
          }
        : null,
    })),
    clientPortalLoginRequests: loginRequests.map((r) => ({
      requestedAt: r.createdAt,
      used: r.usedAt !== null,
    })),
  };
}

// Permanently deletes every row tied to this email, in FK-safe order, plus
// an audit record of the erasure itself (see the comment at its call site
// for why that record — naming the email, not any other data — is kept).
export async function eraseClientData(
  email: string,
  actorId: string | null,
): Promise<{ appointmentsDeleted: number }> {
  const appointments = await prisma.appointment.findMany({
    where: { clientEmail: email },
    select: { id: true },
  });
  const appointmentIds = appointments.map((a) => a.id);

  await prisma.$transaction(async (tx) => {
    if (appointmentIds.length > 0) {
      await tx.auditEvent.deleteMany({ where: { appointmentId: { in: appointmentIds } } });

      const invites = await tx.reviewInvite.findMany({
        where: { appointmentId: { in: appointmentIds } },
        select: { id: true },
      });
      const inviteIds = invites.map((i) => i.id);
      if (inviteIds.length > 0) {
        await tx.review.deleteMany({ where: { reviewInviteId: { in: inviteIds } } });
        await tx.reviewInvite.deleteMany({ where: { id: { in: inviteIds } } });
      }

      await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    }

    await tx.clientLoginToken.deleteMany({ where: { email } });

    await tx.auditEvent.create({
      data: {
        actorId,
        action: "client.data_erased",
        metadata: JSON.stringify({ email, appointmentsDeleted: appointmentIds.length }),
      },
    });
  });

  return { appointmentsDeleted: appointmentIds.length };
}
