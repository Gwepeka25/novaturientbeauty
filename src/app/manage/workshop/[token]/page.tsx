import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canManageWorkshopRegistration } from "@/lib/workshops";
import { formatLocalDateTime } from "@/lib/timezone";
import { cancelMyWorkshopRegistration } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage your workshop registration",
  robots: { index: false, follow: false },
};

export default async function ManageWorkshopRegistrationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const registration = await prisma.workshopRegistration.findUnique({
    where: { manageToken: token },
    include: { workshop: true },
  });

  if (!registration || !canManageWorkshopRegistration(registration, token)) notFound();

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Your workshop registration</small>
        <h1 className="serif">{registration.workshop.title}</h1>
      </div>
      <div className="booking-panel">
        <p>
          {formatLocalDateTime(registration.workshop.startsAt)} (Brussels time) ·{" "}
          {registration.workshop.format === "in_person" ? "In person" : "Online"}
        </p>
        {registration.workshop.location && <p>{registration.workshop.location}</p>}
        <p>Registered as {registration.clientName} ({registration.clientEmail}).</p>

        {registration.status === "confirmed" ? (
          <form action={cancelMyWorkshopRegistration}>
            <input type="hidden" name="token" value={token} />
            <div className="step-actions" style={{ justifyContent: "flex-start" }}>
              <button type="submit" className="button button-outline">
                Cancel my spot
              </button>
            </div>
          </form>
        ) : (
          <p>Your registration has been cancelled.</p>
        )}
      </div>
    </section>
  );
}
