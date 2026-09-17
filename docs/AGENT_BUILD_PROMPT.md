# Build prompt — Michelle Ihirwe booking website

You are a senior product designer and full-stack engineer. Build a production-ready website and lightweight practice-management system for **Michelle Ihirwe, Sexologist & Intimacy Therapist**.

The client has approved **Option 3: Private Sanctuary**, supplied in `/index.html`. Treat that file as the visual source of truth. The final product should feel at least as considered and refined—not like a generic healthcare template and not like a reinterpretation based only on its colours.

## 1. Product goal

Create a calm, discreet website that gives prospective clients confidence in Michelle and helps them book with minimal friction. Michelle must also be able to manage appointments, availability, services, cash-payment status, reviews, and key website content without editing code.

Success means a visitor can quickly answer:

1. Who is Michelle?
2. Can she help with what I am experiencing?
3. Can I meet online or in person?
4. What does a session cost?
5. What happens next, and can I book privately?

Keep public pages focused. Do not overload them with text.

## 2. Approved creative direction

Preserve the identity and layout logic of `/index.html`:

- Michelle’s name is the primary brand; **Novaturient Beauty** is a quiet secondary signature.
- The first screen must reproduce the approved immersive hero: Michelle’s real office photograph fills the full panel; a translucent deep-forest overlay moves diagonally across the left and centre while the brighter room remains visible on the right.
- Place the fine-lined header over the hero: Michelle’s wordmark at top left, three short navigation links centred, and `EN · FR · NL` plus a gold-outline/glass **Book** action at top right.
- The left hero column contains the warm-gold eyebrow `A private space in Jette · Also online`, the very large serif headline `Step out of the noise. Speak freely.`, concise supporting copy, and two rounded actions.
- Anchor Michelle’s light profile card toward the lower-right of the hero. It uses her circular portrait, name, title, and the sentence `Professional guidance with warmth, deep listening and respect for your pace.`
- Below the hero, preserve the approved rhythm: cream breathing space, three rounded session cards, a dark-green “what to expect” band, a two-column fee section, a centred testimonial, and a simple final booking invitation.
- The experience should feel human, private, warm, assured, and premium.
- Use the supplied portrait and office image from `/assets/`. Do not replace them with stock imagery or AI-generated people. In production, reference optimised asset files rather than leaving large base64 images embedded in the page.
- Use a fluid editorial serif in the spirit of **Instrument Serif** with **DM Sans** for interface and body copy. Self-host fonts where licensing permits, or use privacy-conscious loading.
- Palette: deep forest green, soft ivory, muted teal, warm gold, and natural colours from the office photograph.
- Use restrained motion: subtle fades/reveals only, and respect `prefers-reduced-motion`.
- Avoid glossy wellness clichés, generic medical blue, dense icon clutter, decorative gradients, or an unrelated clinical-card template.
- Retain the approved rounded actions and cards, with clear keyboard focus, hover, active, and disabled states.

Match the reference closely on desktop while translating it intelligently to mobile. Do not merely imitate its colours; preserve its proportions, hierarchy, pacing, overlaps, alignment, and editorial tension.

## 3. Voice and core copy

The voice is gentle, direct, inclusive, sex-positive, non-judgmental, and never sensational.

Use this approved hero copy:

> A private space in Jette · Also online
>
> Step out of the noise. Speak freely.
>
> A calm, confidential setting for conversations about intimacy, desire, relationships and connection—with no pressure to arrive with the right words.

Primary CTA: **Find your session**

Secondary CTA: **What to expect**

The first booking choices should be framed around the person rather than a diagnosis:

1. **I’m coming on my own**
2. **We’re coming together**
3. **I’m a student**

Do not diagnose visitors or promise outcomes. Do not imply emergency or crisis support. Include a discreet statement that the service is not an emergency service and direct urgent situations to appropriate local emergency resources once the launch country and legal copy are confirmed.

## 4. Public information architecture

Build a concise site with these routes or equivalent sections:

- `/` — editorial home page and primary booking entry point
- `/about` — Michelle’s approach and verified credentials
- `/sessions` — formats, fees, what to expect, cash-payment note
- `/book` — the complete booking journey
- `/reviews` — consented public reviews and review submission entry
- `/contact` — minimal contact details, location, and practical information
- `/privacy` and `/terms` — approved legal content
- `/admin` — authenticated business-management area

On mobile, use a compact, accessible navigation and a persistent but unobtrusive booking action. Avoid a long menu.

## 5. Michelle’s profile

Use Michelle’s supplied portrait and show her name before the practice name.

Credentials supplied for the project:

- Postgraduate Sexology, Curtin University, 2014
- Bachelor of Psychology, Ghent University, 2007–2011
- Master of Health Promotion, Ghent University, 2011–2013
- Sex, Love and Relationship Coaching, Layla Martin, 2020

These must remain editable in the admin and must be verified by Michelle before launch. Do not invent memberships, protected titles, accreditations, awards, or years of experience.

## 6. Session formats, location, and fees

Offer both:

- **In person** — Rue Amélie Gomand 45, Jette. Use the supplied office image and show practical location information without revealing more than is appropriate.
- **Online** — a private remote session. The secure meeting link is sent only to the booked client, never exposed publicly.

Confirmed fee table:

| Service | Duration | Fee |
| --- | ---: | ---: |
| Individual session | 60 minutes | €70 |
| Student rate | 60 minutes | €55 |
| Couples — first session | 90 minutes | €120 |
| Couples — follow-up | 60 minutes | €95 |
| Additional session time | 30 minutes | €35 |

Payment is currently **cash only**. Present this warmly and plainly, with language such as:

> Your session is a considered exchange of time, attention and care. For now, that exchange is completed in cash at your in-person appointment. If your session is online, Michelle will confirm the payment arrangement privately after booking.

Do not add card fields, payment-provider logos, pre-authorisation, or a misleading “pay online” step. The admin should be able to change payment wording and enable another payment method later without redesigning the product.

## 7. Booking flow

Build a discreet, mobile-first flow:

1. Choose **in person** or **online**.
2. Choose a service.
3. Choose an available date and time.
4. Enter only the necessary contact details.
5. Optionally add a short note, clearly marked optional. Never force a client to disclose intimate details to book.
6. Review the appointment, cash-payment note, privacy link, and cancellation terms.
7. Confirm and receive a neutral, discreet confirmation screen and email.

Requirements:

- Use the `Europe/Brussels` timezone and handle daylight-saving changes correctly.
- Prevent double booking with a server-side transaction/constraint, not client-side checks alone.
- Support configurable weekly availability, one-off blocks, holidays, minimum notice, maximum advance booking, and buffers before/after sessions.
- Session duration comes from the selected service.
- Generate stable appointment IDs and audit important status changes.
- Support statuses: pending/confirmed, completed, cancelled by client, cancelled by Michelle, and no-show.
- Allow secure reschedule/cancellation links with configurable policy limits.
- Send neutral email subject lines and do not put sensitive notes in calendar titles or email previews.
- Online meeting links must be access-controlled and sent only after confirmation.
- Include calendar-file support if it can be implemented without exposing private data.
- Do not ask for health information that is unnecessary for scheduling.

## 8. Reviews

Clients need a safe way to leave reviews; Michelle needs control over publication.

- Send or expose a single-use review link only after a completed appointment.
- Tie verification to the appointment internally, but never reveal the client’s identity publicly.
- Default to first name, initials, or anonymous—chosen by the reviewer.
- Require explicit consent for public display and allow the reviewer to submit private feedback instead.
- Give Michelle a moderation queue: approve, reject, hide, or request removal.
- Let a reviewer request withdrawal later through a secure process.
- Never publish appointment type, intimate details, email, phone number, or other sensitive information.
- Label verified post-appointment reviews distinctly from any manually entered legacy testimonial.
- Do not fabricate star ratings, review counts, or testimonials.

## 9. Admin experience

Create a polished, responsive admin area with role-protected authentication and these modules:

- **Dashboard:** today’s appointments, upcoming sessions, pending actions, and new reviews.
- **Calendar:** day/week/month views, filters for in-person/online and status, manual blocks, and appointment editing.
- **Appointments:** search, status changes, reschedule/cancel, private operational notes only, and cash-payment status.
- **Availability:** recurring schedule, exceptions, holidays, notice periods, booking horizon, and buffers.
- **Services & fees:** name, duration, price, format, active/inactive, display order, and payment wording.
- **Reviews:** verified queue, consent status, moderation, publication order, and takedown handling.
- **Website content:** hero copy, biography, credentials, practical information, FAQs, CTAs, and image alt text.
- **Settings:** contact details, address, timezone, email templates, cancellation policy, and future payment configuration.

Do not turn version one into an electronic health-record system. Store no clinical therapy notes. Keep optional client notes minimal, access-restricted, encrypted where appropriate, and governed by an explicit retention policy.

## 10. Language structure

Prepare the architecture for English, French, and Dutch (`en`, `fr`, `nl`). English is the source language for now. Do not publish unreviewed machine translations. The admin must allow Michelle to add and approve translations later, with clear fallbacks to approved content.

## 11. Privacy, security, and accessibility

This is a sensitive service. Build privacy into the product, not as an afterthought.

- Apply data minimisation, least-privilege access, secure cookies, CSRF protection, input validation, rate limiting, and protection against common injection and enumeration attacks.
- Hash passwords with a modern memory-hard algorithm, or use a reputable managed authentication provider.
- Encrypt data in transit and sensitive data at rest where supported.
- Keep secrets in environment variables; commit only an `.env.example` with placeholders.
- Add audit logging for admin sign-in and material booking/review changes without logging sensitive content.
- Define retention and deletion workflows for booking and review data.
- Add spam protection that does not create unnecessary tracking.
- Avoid advertising pixels and behavioural tracking. Use privacy-respecting analytics only if Michelle opts in.
- Obtain professional legal review for GDPR notices, lawful basis, processor agreements, cookie behaviour, retention periods, professional-title claims, and cancellation terms before launch.
- Meet WCAG 2.2 AA: semantic headings, keyboard access, visible focus, adequate contrast, labels/errors, 44px touch targets, logical reading order, descriptive alt text, reduced motion, and screen-reader announcements for booking changes.

## 12. Technical expectations

Choose a maintainable, well-supported stack and document why. Prefer a typed application, server-rendered public pages, a relational database, migrations, transactional booking logic, and a deployable admin/auth solution. Avoid unnecessary dependencies and vendor lock-in.

Required engineering deliverables:

- Clean component architecture and design tokens derived from the approved reference.
- Responsive layouts at phone, tablet, laptop, and wide-desktop sizes.
- Semantic metadata, Open Graph data, canonical URLs, sitemap, robots configuration, and structured data that does not make unsupported medical claims.
- Optimised responsive images with correct aspect ratios; do not distort or over-crop Michelle’s portrait or office image.
- Database schema and migrations for users/admins, services, availability, blocks, appointments, review invitations, reviews, consent state, and audit events.
- Seed data for the confirmed services/fees, clearly separated from production data.
- Email templates whose visible content remains discreet.
- Error, empty, loading, expired-link, and success states designed to the same quality as the happy path.
- Unit tests for scheduling rules; integration tests for booking and review verification; end-to-end tests for the critical visitor and admin journeys.
- No console errors, broken links, placeholder lorem ipsum, or inaccessible controls.

## 13. Minimum acceptance tests

At minimum, prove that:

- Two clients cannot reserve the same time slot, including concurrent requests.
- Buffers, blocks, notice periods, session durations, and `Europe/Brussels` daylight-saving transitions behave correctly.
- A cancelled slot returns to availability only when policy permits.
- An unauthenticated user cannot access admin data or actions.
- Sensitive appointment fields never appear in public APIs, page source, analytics, email subjects, or calendar titles.
- Review links are single-use/expiring, work only for eligible completed appointments, and require explicit publication consent.
- A hidden or withdrawn review disappears from public pages immediately.
- Cash is the only visible payment method and no online payment is implied.
- The full booking flow works with keyboard and screen reader at mobile and desktop sizes.

## 14. Working method and handoff

Before writing major implementation code:

1. Inspect `/index.html`, the original files in `/reference/`, and all supplied assets.
2. Produce a short route map, component map, data model, and booking state model.
3. List only the genuinely blocking decisions. Make reversible, clearly documented assumptions for non-blocking details.
4. Build the design system and responsive public shell first; compare screenshots directly with the approved reference.
5. Add booking, reviews, and admin in tested vertical slices.

At completion, provide:

- setup and deployment instructions;
- an `.env.example` with no secrets;
- database migration and backup/restore instructions;
- test commands and results;
- screenshots of key pages at mobile and desktop widths;
- an accessibility and privacy checklist;
- a concise list of content/legal decisions Michelle must approve before launch.

Do not declare the project finished if only the public landing page is implemented. The definition of done includes the functioning booking flow, verified-review workflow, and secure admin management described above.
