import type { Metadata } from "next";
import { ManageAppointment } from "@/components/manage-appointment";

export const metadata: Metadata = {
  title: "Manage your appointment",
  robots: { index: false, follow: false },
};

export default async function ManagePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>Your appointment</small>
        <h1 className="serif">Manage your booking.</h1>
      </div>
      <ManageAppointment token={token} />
    </section>
  );
}
