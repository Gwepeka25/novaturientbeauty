// Default/fallback website copy. These are the values seeded into
// WebsiteContent and shown until Michelle edits & approves them in
// /admin/content. Keeping them here means the seed script and the pages
// that render them can never drift out of sync.

export const CONTENT_DEFAULTS = {
  "hero.eyebrow": "A private space in Jette · Also online",
  "hero.heading": "Step out of the noise. Speak freely.",
  "hero.body":
    "A calm, confidential setting for conversations about intimacy, desire, relationships and connection—with no pressure to arrive with the right words.",
  "hero.cta": "Find your session",
  "hero.secondary_cta": "What to expect",
  "hero.profile_tagline":
    "Professional guidance with warmth, deep listening and respect for your pace.",

  "about.bio":
    "I bring a unique blend of expertise and empathy to my work. With a background in psychology and sexology, I've dedicated my career to understanding the complexities of human relationships and the profound impact of self-discovery. My approach is rooted in active listening, creating a safe, judgment-free space where vulnerability becomes a strength. I work with individuals and couples on desire, connection, communication and confidence—you set the pace, I bring my training, full attention and a space held with intention.",
  "about.credentials": JSON.stringify([
    { title: "Postgraduate Sexology", institution: "Curtin University", years: "2014" },
    { title: "Bachelor of Psychology", institution: "Ghent University", years: "2007–2011" },
    { title: "Master of Health Promotion", institution: "Ghent University", years: "2011–2013" },
    { title: "Sex, Love and Relationship Coaching", institution: "Layla Martin", years: "2020" },
  ]),
  "about.specialties": JSON.stringify([
    "Addictions",
    "Female sexual disorder",
    "Male sexual disorder",
    "Vaginismus",
    "Desire disorder",
    "Difficulty communicating with partner",
    "Sexuality problems",
    "Pregnancy follow-up",
    "Harassment",
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

// French/Dutch versions of the same defaults, for the keys translated so
// far. Anything not listed here (credentials, privacy/terms drafts, the
// literal address/email) falls back to the English default in
// src/lib/content.ts — privacy/terms deliberately stay English-only until
// a lawyer has reviewed the English text (see docs/HANDOFF.md).
export const CONTENT_DEFAULTS_FR: Partial<Record<ContentKey, string>> = {
  "hero.eyebrow": "Un espace privé à Jette · Aussi en ligne",
  "hero.heading": "Sortez du bruit. Parlez librement.",
  "hero.body":
    "Un cadre calme et confidentiel pour parler d'intimité, de désir, de relations et de connexion — sans pression de trouver les mots justes.",
  "hero.cta": "Trouver ma séance",
  "hero.secondary_cta": "À quoi s'attendre",
  "hero.profile_tagline":
    "Un accompagnement professionnel, chaleureux, avec une écoute profonde et le respect de votre rythme.",

  "about.bio":
    "J'apporte un mélange unique d'expertise et d'empathie à mon travail. Avec une formation en psychologie et en sexologie, j'ai consacré ma carrière à comprendre la complexité des relations humaines et l'impact profond de la découverte de soi. Mon approche est ancrée dans l'écoute active, créant un espace sûr et sans jugement où la vulnérabilité devient une force. Je travaille avec des individus et des couples sur le désir, la connexion, la communication et la confiance — vous fixez le rythme, j'apporte ma formation, toute mon attention et un espace tenu avec intention.",
  "about.specialties": JSON.stringify([
    "Addictions",
    "Trouble sexuel féminin",
    "Trouble sexuel masculin",
    "Vaginisme",
    "Trouble du désir",
    "Difficulté à communiquer avec son/sa partenaire",
    "Problèmes de sexualité",
    "Suivi de grossesse",
    "Harcèlement",
  ]),

  "contact.note":
    "Pour toute urgence, veuillez contacter votre médecin ou les services d'urgence locaux — ceci n'est pas un service d'urgence.",

  "sessions.cash_note":
    "Votre séance est un échange réfléchi de temps, d'attention et de soin. Pour l'instant, cet échange se fait en espèces lors de votre rendez-vous en présentiel. Pour une séance en ligne, Michelle confirmera les modalités de paiement en privé après la réservation.",
};

export const CONTENT_DEFAULTS_NL: Partial<Record<ContentKey, string>> = {
  "hero.eyebrow": "Een privéruimte in Jette · Ook online",
  "hero.heading": "Stap uit de ruis. Spreek vrijuit.",
  "hero.body":
    "Een rustige, vertrouwelijke omgeving om te praten over intimiteit, verlangen, relaties en connectie — zonder de druk om met de juiste woorden te komen.",
  "hero.cta": "Vind je sessie",
  "hero.secondary_cta": "Wat te verwachten",
  "hero.profile_tagline":
    "Professionele begeleiding met warmte, diep luisteren en respect voor jouw tempo.",

  "about.bio":
    "Ik breng een unieke combinatie van expertise en empathie in mijn werk. Met een achtergrond in psychologie en sexologie heb ik mijn carrière gewijd aan het begrijpen van de complexiteit van menselijke relaties en de diepe impact van zelfontdekking. Mijn aanpak is geworteld in actief luisteren, waarbij ik een veilige, oordeelvrije ruimte creëer waar kwetsbaarheid een kracht wordt. Ik werk met individuen en koppels aan verlangen, connectie, communicatie en zelfvertrouwen — jij bepaalt het tempo, ik breng mijn opleiding, volledige aandacht en een bewust gehouden ruimte.",
  "about.specialties": JSON.stringify([
    "Verslavingen",
    "Vrouwelijke seksuele stoornis",
    "Mannelijke seksuele stoornis",
    "Vaginisme",
    "Verlangensstoornis",
    "Moeite met communiceren met partner",
    "Seksualiteitsproblemen",
    "Zwangerschapsbegeleiding",
    "Intimidatie",
  ]),

  "contact.note":
    "Voor dringende zaken, neem contact op met je huisarts of de lokale hulpdiensten — dit is geen spoeddienst.",

  "sessions.cash_note":
    "Je sessie is een bewuste uitwisseling van tijd, aandacht en zorg. Voorlopig gebeurt die uitwisseling contant tijdens je afspraak in persoon. Voor een online sessie bevestigt Michelle de betalingsregeling privé na de boeking.",
};
