import type { Metadata } from "next";
import { DM_Sans, Italiana } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const italiana = Italiana({
  variable: "--font-italiana",
  subsets: ["latin"],
  weight: ["400"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Michelle Ihirwe — Sexologist & Intimacy Therapist",
    template: "%s — Michelle Ihirwe",
  },
  description:
    "A calm, confidential space to talk about intimacy, desire and connection. In-person sessions in Jette and online sessions, with Michelle Ihirwe, Sexologist & Intimacy Therapist.",
  openGraph: {
    title: "Michelle Ihirwe — Sexologist & Intimacy Therapist",
    description:
      "A calm, confidential space to talk about intimacy, desire and connection.",
    url: siteUrl,
    siteName: "Michelle Ihirwe",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${italiana.variable}`}
      suppressHydrationWarning
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
