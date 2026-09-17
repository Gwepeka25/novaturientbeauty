import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already blocks unauthenticated access to /admin/*; this is a
  // defense-in-depth check so a server component never renders without a
  // valid session even if middleware config ever changes.
  const session = await getSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <AdminSidebar name={session.name} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
