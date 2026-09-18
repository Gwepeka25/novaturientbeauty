"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BRAND_NAME } from "@/lib/site-config";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/finances", label: "Finances" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/appointments", label: "Appointments" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/availability", label: "Availability" },
  { href: "/admin/services", label: "Services & fees" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/content", label: "Website content" },
  { href: "/admin/email-templates", label: "Email templates" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        {BRAND_NAME}
        <small>{name}</small>
      </div>
      <nav className="admin-nav" aria-label="Admin">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <button type="button" className="admin-btn admin-btn-outline admin-signout" onClick={signOut}>
        Sign out
      </button>
    </aside>
  );
}
