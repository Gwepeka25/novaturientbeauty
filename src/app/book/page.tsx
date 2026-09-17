import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { todayLocalISO, addDaysLocalISO } from "@/lib/timezone";
import { BookingWizard } from "@/components/booking-wizard";
import { getLocale } from "@/lib/locale";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book a session",
  description: "Choose a format, service, and time for your confidential session.",
};

export default async function BookPage() {
  const locale = await getLocale();
  const [services, settings] = await Promise.all([
    prisma.service.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.schedulingSettings.findFirst(),
  ]);

  const today = todayLocalISO();
  const maxDate = addDaysLocalISO(today, settings?.maxAdvanceDays ?? 60);

  return (
    <section className="wrap section booking-section">
      <div className="big-title">
        <small>{t(locale, "book_h1_small")}</small>
        <h1 className="serif">{t(locale, "book_h1")}</h1>
      </div>
      <BookingWizard
        locale={locale}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
          currency: s.currency,
          format: s.format,
        }))}
        minDate={today}
        maxDate={maxDate}
      />
    </section>
  );
}
