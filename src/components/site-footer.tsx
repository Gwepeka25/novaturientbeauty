"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_NAME, BRAND_TAGLINE, PRACTITIONER_FULL } from "@/lib/site-config";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer wrap">
      <span>
        {BRAND_NAME} · {PRACTITIONER_FULL}
        <small style={{ display: "block" }}>{BRAND_TAGLINE}</small>
      </span>
      <nav aria-label="Footer">
        <span>Rue Amélie Gomand 45, Jette</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/reviews">Reviews</Link>
        <Link href="/portal">Client portal</Link>
      </nav>
    </footer>
  );
}
