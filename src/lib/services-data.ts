// Confirmed fee table from docs/AGENT_BUILD_PROMPT.md section 6.
// Used to seed the database; the admin "Services & fees" module is the
// source of truth after that — do not hardcode prices elsewhere.
export const CONFIRMED_SERVICES = [
  {
    name: "Individual session",
    description: "A dedicated space focused on your needs",
    durationMin: 60,
    priceCents: 7000,
    format: "both",
    displayOrder: 0,
  },
  {
    name: "Student rate",
    description: "Individual session",
    durationMin: 60,
    priceCents: 5500,
    format: "both",
    displayOrder: 1,
  },
  {
    name: "Couples — first session",
    description: "An extended intake to understand your dynamic",
    durationMin: 90,
    priceCents: 12000,
    format: "both",
    displayOrder: 2,
  },
  {
    name: "Couples — follow-up",
    description: "Continued therapeutic work together",
    durationMin: 60,
    priceCents: 9500,
    format: "both",
    displayOrder: 3,
  },
  {
    name: "Additional session time",
    description: "When agreed and scheduling allows",
    durationMin: 30,
    priceCents: 3500,
    format: "both",
    displayOrder: 4,
  },
] as const;

export function formatFeeCents(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-BE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
