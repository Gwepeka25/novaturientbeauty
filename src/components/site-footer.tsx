"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="site-footer wrap">
      <span>Michelle Ihirwe · Novaturient Beauty</span>
      <nav aria-label="Footer">
        <span>Rue Amélie Gomand 45, Jette</span>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/reviews">Reviews</Link>
      </nav>
    </footer>
  );
}
