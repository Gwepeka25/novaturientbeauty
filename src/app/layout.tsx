import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND_NAME, PRACTITIONER_FULL } from "@/lib/site-config";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BRAND_NAME} — ${PRACTITIONER_FULL}`,
    template: `%s — ${BRAND_NAME}`,
  },
  description: `${BRAND_NAME}: a calm, confidential space to talk about intimacy, desire and connection. In-person sessions in Jette and online sessions, with ${PRACTITIONER_FULL}.`,
  openGraph: {
    title: `${BRAND_NAME} — ${PRACTITIONER_FULL}`,
    description:
      "A calm, confidential space to talk about intimacy, desire and connection.",
    url: siteUrl,
    siteName: BRAND_NAME,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${instrumentSerif.variable}`}
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
