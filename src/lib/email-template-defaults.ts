/**
 * Compiled-in default subject/body for every outgoing email, plus the pure
 * {{variable}} substitution used to render one. Mirrors the WebsiteContent /
 * content-defaults.ts split: this file has no Prisma dependency, so it's
 * unit-testable on its own — src/lib/email-templates.ts is the thin
 * DB-fetching wrapper that decides default vs. an admin's approved edit.
 *
 * Every send* function in src/lib/email.ts always adds `brandName` to the
 * variables it substitutes, so it doesn't need to be listed per template.
 * A placeholder with no matching variable is left in the output untouched
 * (rather than silently blanked), so a typo'd {{varName}} in an edited
 * template is obvious in the sent email instead of just vanishing.
 */

export type EmailTemplateKey =
  | "booking_confirmation"
  | "appointment_reminder"
  | "receipt"
  | "admin_booking_notification"
  | "review_invite"
  | "client_portal_link"
  | "waitlist_joined"
  | "waitlist_slot_available"
  | "reengagement"
  | "workshop_registration_confirmation"
  | "digital_resource_download_ready";

export const EMAIL_TEMPLATE_KEYS: EmailTemplateKey[] = [
  "booking_confirmation",
  "appointment_reminder",
  "receipt",
  "admin_booking_notification",
  "review_invite",
  "client_portal_link",
  "waitlist_joined",
  "waitlist_slot_available",
  "reengagement",
  "workshop_registration_confirmation",
  "digital_resource_download_ready",
];

export type EmailTemplate = { subject: string; bodyHtml: string };

export type EmailTemplateDefault = EmailTemplate & {
  label: string;
  description: string;
  variables: string[];
};

export const EMAIL_TEMPLATE_DEFAULTS: Record<EmailTemplateKey, EmailTemplateDefault> = {
  booking_confirmation: {
    label: "Booking confirmation",
    description: "Sent to the client immediately after they book.",
    variables: ["clientName", "appointmentDateTime", "publicCode", "manageUrl"],
    subject: "Your appointment confirmation",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Your appointment is confirmed for {{appointmentDateTime}} (Brussels time).</p>
<p>Reference: {{publicCode}}</p>
<p>You can view, reschedule or cancel your appointment here: <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>Payment is by cash for in-person sessions. If your session is online, the meeting link and any payment arrangement will be confirmed here closer to your appointment.</p>
<p>See you soon.</p>
<p>— {{brandName}}</p>`,
  },
  appointment_reminder: {
    label: "Day-before reminder",
    description: "Sent automatically about 24 hours before a confirmed appointment.",
    variables: ["clientName", "appointmentDateTime", "publicCode", "manageUrl"],
    subject: "Reminder: your appointment tomorrow",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>A reminder that your appointment is tomorrow, {{appointmentDateTime}} (Brussels time).</p>
<p>Reference: {{publicCode}}</p>
<p>Need to reschedule or cancel? <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>See you soon.</p>
<p>— {{brandName}}</p>`,
  },
  receipt: {
    label: "Session receipt",
    description: "Sent automatically once a session is marked completed.",
    variables: [
      "clientName",
      "appointmentDateTime",
      "practitionerFull",
      "serviceName",
      "durationMin",
      "formatLabel",
      "paymentMethod",
      "amount",
      "publicCode",
    ],
    subject: "Your session receipt",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Here's your receipt for the session on {{appointmentDateTime}} (Brussels time).</p>
<table cellpadding="4" cellspacing="0">
  <tr><td>Practitioner</td><td>{{practitionerFull}}</td></tr>
  <tr><td>Session</td><td>{{serviceName}}</td></tr>
  <tr><td>Duration</td><td>{{durationMin}} minutes</td></tr>
  <tr><td>Format</td><td>{{formatLabel}}</td></tr>
  <tr><td>Payment method</td><td>{{paymentMethod}}</td></tr>
  <tr><td>Amount</td><td>{{amount}}</td></tr>
  <tr><td>Reference</td><td>{{publicCode}}</td></tr>
</table>
<p>— {{brandName}}</p>`,
  },
  admin_booking_notification: {
    label: "New-booking notification (to you)",
    description: "Sent to your own inbox for every new booking — deliberately detailed, unlike the client-facing emails.",
    variables: [
      "appointmentDateTime",
      "serviceName",
      "formatLabel",
      "clientName",
      "clientContact",
      "clientNote",
      "publicCode",
      "adminUrl",
    ],
    subject: "New booking: {{appointmentDateTime}}",
    bodyHtml: `<p>New booking received.</p>
<ul>
  <li><strong>When:</strong> {{appointmentDateTime}} (Brussels time)</li>
  <li><strong>Service:</strong> {{serviceName}}</li>
  <li><strong>Format:</strong> {{formatLabel}}</li>
  <li><strong>Client:</strong> {{clientName}} — {{clientContact}}</li>
  <li><strong>Note from client:</strong> {{clientNote}}</li>
  <li><strong>Reference:</strong> {{publicCode}}</li>
</ul>
<p><a href="{{adminUrl}}">View in the admin dashboard</a></p>`,
  },
  review_invite: {
    label: "Review invite",
    description: "Sent alongside the receipt when a session is marked completed.",
    variables: ["clientName", "reviewUrl"],
    subject: "A quick follow-up",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Thank you for your recent appointment. If you'd like to, you can leave a private review here — you choose whether it's published, and how you're identified.</p>
<p><a href="{{reviewUrl}}">{{reviewUrl}}</a></p>
<p>This link is single-use and will expire after 30 days.</p>
<p>— {{brandName}}</p>`,
  },
  client_portal_link: {
    label: "Client portal login link",
    description: "Sent when a client requests a passwordless link to their portal.",
    variables: ["portalUrl"],
    subject: "Your client portal link",
    bodyHtml: `<p>Hi,</p>
<p>Use this secure link to view your appointment history and download session receipts:</p>
<p><a href="{{portalUrl}}">{{portalUrl}}</a></p>
<p>This link is single-use and expires in 30 minutes. If you didn't request it, you can safely ignore this email.</p>
<p>— {{brandName}}</p>`,
  },
  waitlist_joined: {
    label: "Waitlist confirmation",
    description: "Sent when a client joins the waitlist for a fully-booked date.",
    variables: ["clientName", "serviceName", "formatLabel", "dateLabel", "bookUrl"],
    subject: "You're on the waitlist",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>You're on the waitlist for {{serviceName}} ({{formatLabel}}) on {{dateLabel}}. If a time opens up on that date, we'll email you straight away so you can book it.</p>
<p>In the meantime, you're welcome to book any other available date here: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  waitlist_slot_available: {
    label: "Waitlist slot opened up",
    description: "Sent when an appointment is cancelled and a waitlisted client can now book it.",
    variables: ["clientName", "serviceName", "formatLabel", "dateLabel", "bookUrl"],
    subject: "A time just opened up",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Good news — a time just opened up for {{serviceName}} ({{formatLabel}}) on {{dateLabel}}.</p>
<p>Slots are first-come, first-served, so it's worth booking soon: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  reengagement: {
    label: "Re-engagement (lapsed client)",
    description: "Sent automatically to clients who haven't booked in a while.",
    variables: ["clientName", "bookUrl"],
    subject: "It's been a while",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>It's been a while since your last session — we just wanted to say the door's still open whenever you'd like to come back.</p>
<p>You can book a time here, whenever suits: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  workshop_registration_confirmation: {
    label: "Workshop registration confirmation",
    description: "Sent to a client immediately after they register for a workshop.",
    variables: ["clientName", "workshopTitle", "workshopDateTime", "formatLabel", "location", "manageUrl"],
    subject: "You're registered — {{workshopTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>You're registered for {{workshopTitle}} on {{workshopDateTime}} (Brussels time), {{formatLabel}}.</p>
<p>{{location}}</p>
<p>You can cancel your spot here if you need to: <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>See you there.</p>
<p>— {{brandName}}</p>`,
  },
  digital_resource_download_ready: {
    label: "Digital resource — download ready",
    description: "Sent once payment for a digital resource is confirmed, with the download link.",
    variables: ["clientName", "resourceTitle", "downloadUrl"],
    subject: "Your download is ready — {{resourceTitle}}",
    bodyHtml: `<p>Hi {{clientName}},</p>
<p>Thanks for your purchase. Your download is ready:</p>
<p><a href="{{downloadUrl}}">{{downloadUrl}}</a></p>
<p>This link stays active for 30 days.</p>
<p>— {{brandName}}</p>`,
  },
};

// French/Dutch subject+body for the client-facing templates. Deliberately
// excludes admin_booking_notification — that one lands in Michelle's own
// inbox, not a client's, so translating it wouldn't serve anyone. A key not
// listed here (or in the NL dictionary) simply isn't offered for
// translation in /admin/email-templates — same "not everything needs it"
// reasoning as content-defaults.ts.
export const EMAIL_TEMPLATE_DEFAULTS_FR: Partial<Record<EmailTemplateKey, EmailTemplate>> = {
  booking_confirmation: {
    subject: "Confirmation de votre rendez-vous",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Votre rendez-vous est confirmé pour le {{appointmentDateTime}} (heure de Bruxelles).</p>
<p>Référence : {{publicCode}}</p>
<p>Vous pouvez consulter, reprogrammer ou annuler votre rendez-vous ici : <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>Le paiement se fait en espèces pour les séances en présentiel. Pour une séance en ligne, le lien de connexion et les modalités de paiement seront confirmés ici à l'approche du rendez-vous.</p>
<p>À bientôt.</p>
<p>— {{brandName}}</p>`,
  },
  appointment_reminder: {
    subject: "Rappel : votre rendez-vous demain",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Petit rappel : votre rendez-vous est demain, {{appointmentDateTime}} (heure de Bruxelles).</p>
<p>Référence : {{publicCode}}</p>
<p>Besoin de reprogrammer ou d'annuler ? <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>À bientôt.</p>
<p>— {{brandName}}</p>`,
  },
  receipt: {
    subject: "Votre reçu de séance",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Voici votre reçu pour la séance du {{appointmentDateTime}} (heure de Bruxelles).</p>
<table cellpadding="4" cellspacing="0">
  <tr><td>Praticienne</td><td>{{practitionerFull}}</td></tr>
  <tr><td>Séance</td><td>{{serviceName}}</td></tr>
  <tr><td>Durée</td><td>{{durationMin}} minutes</td></tr>
  <tr><td>Format</td><td>{{formatLabel}}</td></tr>
  <tr><td>Mode de paiement</td><td>{{paymentMethod}}</td></tr>
  <tr><td>Montant</td><td>{{amount}}</td></tr>
  <tr><td>Référence</td><td>{{publicCode}}</td></tr>
</table>
<p>— {{brandName}}</p>`,
  },
  review_invite: {
    subject: "Un petit suivi",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Merci pour votre récent rendez-vous. Si vous le souhaitez, vous pouvez laisser un avis privé ici — vous choisissez s'il est publié, et comment vous êtes identifié(e).</p>
<p><a href="{{reviewUrl}}">{{reviewUrl}}</a></p>
<p>Ce lien est à usage unique et expirera après 30 jours.</p>
<p>— {{brandName}}</p>`,
  },
  client_portal_link: {
    subject: "Votre lien vers l'espace client",
    bodyHtml: `<p>Bonjour,</p>
<p>Utilisez ce lien sécurisé pour consulter l'historique de vos rendez-vous et télécharger vos reçus de séance :</p>
<p><a href="{{portalUrl}}">{{portalUrl}}</a></p>
<p>Ce lien est à usage unique et expire dans 30 minutes. Si vous n'avez rien demandé, vous pouvez ignorer cet email sans problème.</p>
<p>— {{brandName}}</p>`,
  },
  waitlist_joined: {
    subject: "Vous êtes sur la liste d'attente",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Vous êtes sur la liste d'attente pour {{serviceName}} ({{formatLabel}}) le {{dateLabel}}. Si un créneau se libère ce jour-là, nous vous préviendrons immédiatement par email afin que vous puissiez le réserver.</p>
<p>En attendant, vous êtes libre de réserver toute autre date disponible ici : <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  waitlist_slot_available: {
    subject: "Un créneau vient de se libérer",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Bonne nouvelle — un créneau vient de se libérer pour {{serviceName}} ({{formatLabel}}) le {{dateLabel}}.</p>
<p>Les créneaux sont attribués dans l'ordre d'arrivée, mieux vaut donc réserver rapidement : <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  reengagement: {
    subject: "Cela fait un moment",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Cela fait un moment depuis votre dernière séance — nous voulions simplement vous dire que la porte reste ouverte, quand vous souhaiterez revenir.</p>
<p>Vous pouvez réserver un créneau ici, quand cela vous convient : <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  workshop_registration_confirmation: {
    subject: "Votre inscription est confirmée — {{workshopTitle}}",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Vous êtes inscrit(e) à {{workshopTitle}} le {{workshopDateTime}} (heure de Bruxelles), {{formatLabel}}.</p>
<p>{{location}}</p>
<p>Vous pouvez annuler votre place ici si besoin : <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>À bientôt.</p>
<p>— {{brandName}}</p>`,
  },
  digital_resource_download_ready: {
    subject: "Votre téléchargement est prêt — {{resourceTitle}}",
    bodyHtml: `<p>Bonjour {{clientName}},</p>
<p>Merci pour votre achat. Votre téléchargement est prêt :</p>
<p><a href="{{downloadUrl}}">{{downloadUrl}}</a></p>
<p>Ce lien reste actif pendant 30 jours.</p>
<p>— {{brandName}}</p>`,
  },
};

export const EMAIL_TEMPLATE_DEFAULTS_NL: Partial<Record<EmailTemplateKey, EmailTemplate>> = {
  booking_confirmation: {
    subject: "Bevestiging van je afspraak",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Je afspraak is bevestigd voor {{appointmentDateTime}} (Brusselse tijd).</p>
<p>Referentie: {{publicCode}}</p>
<p>Je kan je afspraak hier bekijken, verplaatsen of annuleren: <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>Betaling gebeurt contant voor sessies in persoon. Voor een online sessie worden de vergaderlink en de betalingsregeling hier bevestigd naarmate je afspraak dichterbij komt.</p>
<p>Tot binnenkort.</p>
<p>— {{brandName}}</p>`,
  },
  appointment_reminder: {
    subject: "Herinnering: je afspraak morgen",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Even een herinnering: je afspraak is morgen, {{appointmentDateTime}} (Brusselse tijd).</p>
<p>Referentie: {{publicCode}}</p>
<p>Moet je verplaatsen of annuleren? <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>Tot binnenkort.</p>
<p>— {{brandName}}</p>`,
  },
  receipt: {
    subject: "Je sessiebon",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Hier is je bon voor de sessie op {{appointmentDateTime}} (Brusselse tijd).</p>
<table cellpadding="4" cellspacing="0">
  <tr><td>Behandelaar</td><td>{{practitionerFull}}</td></tr>
  <tr><td>Sessie</td><td>{{serviceName}}</td></tr>
  <tr><td>Duur</td><td>{{durationMin}} minuten</td></tr>
  <tr><td>Format</td><td>{{formatLabel}}</td></tr>
  <tr><td>Betaalmethode</td><td>{{paymentMethod}}</td></tr>
  <tr><td>Bedrag</td><td>{{amount}}</td></tr>
  <tr><td>Referentie</td><td>{{publicCode}}</td></tr>
</table>
<p>— {{brandName}}</p>`,
  },
  review_invite: {
    subject: "Een korte follow-up",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Bedankt voor je recente afspraak. Als je dat wil, kan je hier een privé review achterlaten — jij kiest of ze gepubliceerd wordt, en hoe je geïdentificeerd wordt.</p>
<p><a href="{{reviewUrl}}">{{reviewUrl}}</a></p>
<p>Deze link is eenmalig te gebruiken en verloopt na 30 dagen.</p>
<p>— {{brandName}}</p>`,
  },
  client_portal_link: {
    subject: "Je link naar het klantenportaal",
    bodyHtml: `<p>Hoi,</p>
<p>Gebruik deze beveiligde link om je afsprakenoverzicht te bekijken en je sessiebonnen te downloaden:</p>
<p><a href="{{portalUrl}}">{{portalUrl}}</a></p>
<p>Deze link is eenmalig te gebruiken en verloopt na 30 minuten. Als je dit niet hebt aangevraagd, kan je deze e-mail gewoon negeren.</p>
<p>— {{brandName}}</p>`,
  },
  waitlist_joined: {
    subject: "Je staat op de wachtlijst",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Je staat op de wachtlijst voor {{serviceName}} ({{formatLabel}}) op {{dateLabel}}. Als er die dag een plek vrijkomt, mailen we je meteen zodat je kan boeken.</p>
<p>Ondertussen kan je gerust een andere beschikbare datum boeken hier: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  waitlist_slot_available: {
    subject: "Er is net een plek vrijgekomen",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Goed nieuws — er is net een plek vrijgekomen voor {{serviceName}} ({{formatLabel}}) op {{dateLabel}}.</p>
<p>Plekken zijn beschikbaar op basis van wie eerst komt, dus boek snel: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  reengagement: {
    subject: "Het is even geleden",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Het is even geleden sinds je laatste sessie — we wilden je gewoon laten weten dat de deur openstaat wanneer je terug wil komen.</p>
<p>Je kan hier een moment boeken, wanneer het jou past: <a href="{{bookUrl}}">{{bookUrl}}</a></p>
<p>— {{brandName}}</p>`,
  },
  workshop_registration_confirmation: {
    subject: "Je inschrijving is bevestigd — {{workshopTitle}}",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Je bent ingeschreven voor {{workshopTitle}} op {{workshopDateTime}} (Brusselse tijd), {{formatLabel}}.</p>
<p>{{location}}</p>
<p>Je kan je plek hier annuleren als dat nodig is: <a href="{{manageUrl}}">{{manageUrl}}</a></p>
<p>Tot dan.</p>
<p>— {{brandName}}</p>`,
  },
  digital_resource_download_ready: {
    subject: "Je download is klaar — {{resourceTitle}}",
    bodyHtml: `<p>Hoi {{clientName}},</p>
<p>Bedankt voor je aankoop. Je download is klaar:</p>
<p><a href="{{downloadUrl}}">{{downloadUrl}}</a></p>
<p>Deze link blijft 30 dagen actief.</p>
<p>— {{brandName}}</p>`,
  },
};

// Keys with at least one compiled French or Dutch default — the ones
// /admin/email-templates offers to translate.
export const TRANSLATABLE_EMAIL_KEYS: EmailTemplateKey[] = EMAIL_TEMPLATE_KEYS.filter(
  (key) => key in EMAIL_TEMPLATE_DEFAULTS_FR || key in EMAIL_TEMPLATE_DEFAULTS_NL,
);

/** Substitutes {{name}} tokens; a name with no matching variable is left untouched. */
export function renderEmailTemplate(template: EmailTemplate, vars: Record<string, string>): EmailTemplate {
  return {
    subject: substitute(template.subject, vars),
    bodyHtml: substitute(template.bodyHtml, vars),
  };
}

function substitute(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}
