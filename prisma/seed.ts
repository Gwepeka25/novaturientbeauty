import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CONFIRMED_SERVICES } from "../src/lib/services-data";
import { CONTENT_DEFAULTS } from "../src/lib/content-defaults";

const prisma = new PrismaClient();

// Keys explicitly approved by the client in docs/AGENT_BUILD_PROMPT.md.
// Everything else seeds as unapproved (pending Michelle's / legal review),
// falling back to the same default copy until someone approves it in admin.
const PRE_APPROVED_KEYS = new Set([
  "hero.eyebrow",
  "hero.heading",
  "hero.opening",
  "hero.body",
  "hero.cta",
  "sessions.cash_note",
  "contact.address",
]);

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env before seeding.",
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: adminName },
    create: { email: adminEmail, passwordHash, name: adminName },
  });
  console.log(`Admin user ready: ${adminEmail}`);

  for (const service of CONFIRMED_SERVICES) {
    const existing = await prisma.service.findFirst({
      where: { name: service.name },
    });
    if (existing) {
      await prisma.service.update({ where: { id: existing.id }, data: service });
    } else {
      await prisma.service.create({ data: service });
    }
  }
  console.log(`Seeded ${CONFIRMED_SERVICES.length} services.`);

  const existingSettings = await prisma.schedulingSettings.findFirst();
  if (!existingSettings) {
    await prisma.schedulingSettings.create({
      data: {
        timezone: "Europe/Brussels",
        minNoticeMinutes: 24 * 60,
        maxAdvanceDays: 60,
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 15,
      },
    });
    console.log("Created default scheduling settings.");
  }

  const existingRules = await prisma.availabilityRule.count();
  if (existingRules === 0) {
    // Placeholder Mon-Fri 09:00-17:00 availability. Operational default only —
    // Michelle must confirm real weekly availability in the admin area.
    const weekdays = [1, 2, 3, 4, 5];
    await prisma.availabilityRule.createMany({
      data: weekdays.map((weekday) => ({
        weekday,
        startMinute: 9 * 60,
        endMinute: 17 * 60,
      })),
    });
    console.log("Created placeholder Mon-Fri 09:00-17:00 availability rules.");
  }

  const existingLegacyReview = await prisma.review.findFirst({
    where: { isLegacy: true },
  });
  if (!existingLegacyReview) {
    await prisma.review.create({
      data: {
        body:
          "I felt seen and understood—a space both safe and challenging, with little being lost in translation.",
        displayNameMode: "anonymous",
        displayName: "Client reflection · Shared with permission",
        consentPublic: true,
        status: "approved",
        isLegacy: true,
        publishOrder: 0,
      },
    });
    console.log("Seeded legacy testimonial.");
  }

  for (const [key, value] of Object.entries(CONTENT_DEFAULTS)) {
    await prisma.websiteContent.upsert({
      where: { key_locale: { key, locale: "en" } },
      update: {},
      create: {
        key,
        locale: "en",
        value,
        approved: PRE_APPROVED_KEYS.has(key),
      },
    });
  }
  console.log(`Seeded ${Object.keys(CONTENT_DEFAULTS).length} website content entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
