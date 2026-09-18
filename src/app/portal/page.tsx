import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getClientSession } from "@/lib/client-session";
import { formatLocalDateTime } from "@/lib/timezone";
import { getActivePackagesForClient } from "@/lib/packages";
import { requestPortalLinkAction, portalLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Portal",
  robots: { index: false, follow: false },
};

const MILESTONES = [3, 5, 10, 20, 50, 100];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled_by_client: "Cancelled",
  cancelled_by_practitioner: "Cancelled",
  no_show: "Marked as no-show",
};

export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  const session = await getClientSession();

  if (!session) {
    return (
      <section className="wrap section booking-section">
        <div className="big-title">
          <small>Client portal</small>
          <h1 className="serif">View your appointments &amp; receipts.</h1>
        </div>
        <p>
          Enter the email you used when booking, and we&rsquo;ll send you a secure
          sign-in link — no password to remember.
        </p>

        {sent && (
          <p role="status" className="portal-notice">
            If that email has appointments with us, a link is on its way. It
            expires in 30 minutes.
          </p>
        )}
        {error === "invalid_link" && (
          <p className="form-error" role="alert">
            That link is invalid or has expired. Please request a new one below.
          </p>
        )}
        {error === "too_many" && (
          <p className="form-error" role="alert">
            Too many attempts. Please wait a few minutes and try again.
          </p>
        )}
        {error === "invalid_email" && (
          <p className="form-error" role="alert">
            Please enter a valid email address.
          </p>
        )}

        <form action={requestPortalLinkAction} className="portal-request-form">
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <button className="button" type="submit">
            Send me a link
          </button>
        </form>
      </section>
    );
  }

  const appointments = await prisma.appointment.findMany({
    where: { clientEmail: session.email },
    orderBy: { startsAt: "desc" },
    include: { service: true },
  });
  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.startsAt > now && (a.status === "pending" || a.status === "confirmed"),
  );
  const past = appointments.filter((a) => !upcoming.includes(a));
  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const milestone = MILESTONES.includes(completedCount) ? completedCount : null;
  const activePackages = await getActivePackagesForClient(session.email);

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Client portal</small>
        <h1 className="serif">Your appointments.</h1>
      </div>

      <form action={portalLogoutAction} className="portal-signout">
        <button type="submit" className="button button-outline">
          Sign out
        </button>
      </form>

      {milestone && (
        <p className="portal-milestone" role="status">
          You&rsquo;ve completed {milestone} session{milestone === 1 ? "" : "s"} with Michelle — thank you for
          trusting us with your journey.
        </p>
      )}

      <div className="portal-book-next">
        <Link className="button" href="/book">
          Book your next session
        </Link>
      </div>

      {activePackages.length > 0 && (
        <div className="portal-packages">
          <h2 className="serif">Your packages</h2>
          <ul className="portal-package-list">
            {activePackages.map((p) => (
              <li key={p.id}>
                {p.serviceName ?? "Any service"} — {p.totalSessions - p.usedSessions} of {p.totalSessions}{" "}
                session{p.totalSessions === 1 ? "" : "s"} remaining
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="serif">Upcoming</h2>
      {upcoming.length === 0 && <p>No upcoming appointments.</p>}
      {upcoming.length > 0 && (
        <ul className="portal-appointment-list">
          {upcoming.map((a) => (
            <li key={a.id}>
              <div>
                <b>{a.service.name}</b>
                <p>{formatLocalDateTime(a.startsAt)}</p>
                <small>{STATUS_LABEL[a.status] ?? a.status}</small>
              </div>
              <Link className="button button-outline" href={`/manage/${a.manageToken}`}>
                Manage
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="serif">Past</h2>
      {past.length === 0 && <p>No past appointments yet.</p>}
      {past.length > 0 && (
        <ul className="portal-appointment-list">
          {past.map((a) => (
            <li key={a.id}>
              <div>
                <b>{a.service.name}</b>
                <p>{formatLocalDateTime(a.startsAt)}</p>
                <small>{STATUS_LABEL[a.status] ?? a.status}</small>
                {a.clientVisibleNote && <p className="portal-note">{a.clientVisibleNote}</p>}
              </div>
              {a.status === "completed" && (
                <Link className="button button-outline" href={`/portal/receipt/${a.id}`}>
                  View receipt
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
