import Link from "next/link";
import { requireAdminSession } from "@/lib/admin-auth";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export default async function AdminSettingsPage() {
  const session = await requireAdminSession();

  return (
    <>
      <h1 className="admin-page-title">Settings</h1>
      <p className="admin-page-subtitle">Signed in as {session.email}.</p>

      <div className="admin-card">
        <h2>Change password</h2>
        <ChangePasswordForm />
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
