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
  "hero.body",
  "hero.cta",
  "hero.secondary_cta",
  "hero.profile_tagline",
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

  // Real testimonials from novaturientbeauty.com, each in the language the
  // client actually wrote it in — kept as-is rather than translated, and
  // shown regardless of the site's current language (the real site does
  // the same: all three together, not filtered by viewer language).
  const LEGACY_TESTIMONIALS = [
    {
      displayName: "Marie",
      body: "As a therapist, Michelle is an active listener that is committed to authentic healing. Through our work together, I learned and practiced healing as a path that I didn't have to walk alone. A journey where accountability meant to be sincere and vulnerable with oneself and others. As an afrodescent woman in her 30s who grew up in Western Europe, I explored therapy with caution, distrust and lots of questions. Luckily, I found great comfort and ease not having to explain the basics of our « familial » structures in a therapy session, for example. I felt seen and understood without the frustration of failing to translate the many facets of the afrodiasporic experience, I don't always have the words for in English or French. Therapy is uncomfortable, truly, so I am grateful to have found, with Michelle, a space both safe and challenging with little being lost in translation.",
      publishOrder: 0,
    },
    {
      displayName: "Gwenn",
      body: "Un immense merci à Michelle pour son accompagnement, qui a été une véritable transformation pour moi.\n\nGrâce à son écoute profonde et sa clairvoyance, elle a su mettre en lumière des schémas de vie que je ne percevais pas. Avec bienveillance, elle m'a guidée vers une meilleure compréhension de moi-même, de mon corps et de mes émotions, qui m'étaient jusque-là inconnus.\n\nSon accompagnement a été une révélation, et je recommande sans hésitation à toute personne en quête d'évolution de se faire accompagner par elle.",
      publishOrder: 1,
    },
    {
      displayName: "Isabelle",
      body: "“If you are depressed you are living in the past. If you are anxious you are living in the future. If you are at peace you are living in the present.” – Lao Tzu : Michelle leert mij meer genieten van het leven. Zij is de breeddenkend persoon die ik ken, geen menselijk onderwerp is haar vreemd. Ik kan leren wat veiligheid betekent in een relatie",
      publishOrder: 2,
    },
  ];

  // Drop the earlier placeholder (a decontextualized, unattributed excerpt
  // from Marie's real quote) now that the real, attributed testimonials are
  // seeded below.
  await prisma.review.deleteMany({
    where: { isLegacy: true, displayName: "Client reflection · Shared with permission" },
  });

  for (const testimonial of LEGACY_TESTIMONIALS) {
    const existing = await prisma.review.findFirst({
      where: { isLegacy: true, displayName: testimonial.displayName },
    });
    const data = {
      body: testimonial.body,
      displayNameMode: "first_name" as const,
      displayName: testimonial.displayName,
      consentPublic: true,
      status: "approved",
      isLegacy: true,
      publishOrder: testimonial.publishOrder,
    };
    if (existing) {
      await prisma.review.update({ where: { id: existing.id }, data });
    } else {
      await prisma.review.create({ data });
    }
  }
  console.log(`Seeded ${LEGACY_TESTIMONIALS.length} real legacy testimonials.`);

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
