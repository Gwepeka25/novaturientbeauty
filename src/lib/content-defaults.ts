// Default/fallback website copy. These are the values seeded into
// WebsiteContent and shown until Michelle edits & approves them in
// /admin/content. Keeping them here means the seed script and the pages
// that render them can never drift out of sync.

export const CONTENT_DEFAULTS = {
  "hero.eyebrow": "A note from Michelle",
  "hero.heading": "There is nothing wrong with needing a safe place to talk.",
  "hero.opening":
    "You are allowed to be curious, uncertain, hopeful—or all three at once.",
  "hero.body":
    "My role is not to tell you who to be. It is to listen deeply, help you understand what is happening beneath the surface and support you as you move toward greater confidence, connection and ease.",
  "hero.cta": "Begin with a confidential session",

  "about.bio":
    "Michelle Ihirwe is a sexologist and intimacy therapist working with individuals and couples on desire, connection, communication and confidence. Her approach is gentle, direct and non-judgmental: you set the pace, she brings her training, full attention and a space held with intention.",
  "about.credentials": JSON.stringify([
    { title: "Postgraduate Sexology", institution: "Curtin University", years: "2014" },
    { title: "Bachelor of Psychology", institution: "Ghent University", years: "2007–2011" },
    { title: "Master of Health Promotion", institution: "Ghent University", years: "2011–2013" },
    { title: "Sex, Love and Relationship Coaching", institution: "Layla Martin", years: "2020" },
  ]),

  "contact.address": "Rue Amélie Gomand 45, Jette",
  "contact.email": "hello@example.com",
  "contact.phone": "",
  "contact.note":
    "For urgent matters, please contact your GP or local emergency services — this is not an emergency service.",

  "sessions.cash_note":
    "Your session is a considered exchange of time, attention and care. For now, that exchange is completed in cash at your in-person appointment. If your session is online, Michelle will confirm the payment arrangement privately after booking.",

  "privacy.body": "DRAFT — needs legal review before launch.",
  "terms.body": "DRAFT — needs legal review before launch.",
} as const;

export type ContentKey = keyof typeof CONTENT_DEFAULTS;
