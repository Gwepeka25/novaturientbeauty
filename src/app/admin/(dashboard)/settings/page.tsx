import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { RegenerateCalendarFeedButton } from "@/components/admin/regenerate-calendar-feed-button";
import { getOrCreateCalendarFeedToken } from "@/lib/calendar-feed";

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();
  const feedToken = await getOrCreateCalendarFeedToken(session.sub);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const feedUrl = `${siteUrl}/api/calendar-feed/${feedToken}`;

  return (
    <>
      <h1 className="admin-page-title">Settings</h1>
      <p className="admin-page-subtitle">Signed in as {session.email}.</p>

      <div className="admin-card">
        <h2>Change password</h2>
        <ChangePasswordForm />
      </div>

      <div className="admin-card">
        <h2>Calendar sync</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
          Subscribe to this link from Google Calendar, Apple Calendar or Outlook to see all
          upcoming appointments (client name, service and reference) update automatically. Treat
          it like a password — anyone with the link can see your schedule.
        </p>
        <p
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            wordBreak: "break-all",
            background: "var(--paper)",
            padding: "10px 12px",
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          {feedUrl}
        </p>
        <div className="admin-form-actions">
          <RegenerateCalendarFeedButton />
        </div>
      </div>

      <div className="admin-card">
        <h2>Business details &amp; policy</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7 }}>
          Contact details, address and the cash-payment note are edited on the{" "}
          <Link href="/admin/content">Website content</Link> page. Booking windows, buffers and
          the cancellation cutoff are on the <Link href="/admin/availability">Availability</Link>{" "}
          page. Timezone is fixed to Europe/Brussels.
        </p>
      </div>
    </>
  );
}
