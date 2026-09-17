# Handoff: pre-launch checklist

This is the punch list for going from "code is done" to "real clients can book." Read this before telling Michelle the site is ready.

## 1. Decisions Michelle must approve before launch

Nothing below is fabricated — each is either a reasonable placeholder clearly marked as such, or an operational default that needs her sign-off, not a legal/content decision made on her behalf.

| Item | Where | Status |
| --- | --- | --- |
| Credentials (institutions, years) | `/admin/content` → About | Entered from the build brief; must be **verified** by Michelle before launch (not yet marked approved) |
| About bio paragraph | `/admin/content` → About | Drafted by the build; needs Michelle's voice/approval |
| Contact email & phone | `/admin/content` → Contact | Placeholder (`hello@example.com`, blank phone) — must be replaced |
| Privacy Policy | `/privacy` | **Draft, explicitly labeled "needs legal review"** — do not launch without a lawyer reviewing GDPR lawful basis, retention periods, and data-subject rights |
| Terms & Cancellation Policy | `/terms` | **Draft, explicitly labeled "needs legal review"** — cancellation window (currently 24h), no-show policy, and the "not an emergency service" wording all need Michelle + legal sign-off |
| Weekly availability (Mon–Fri 09:00–17:00) | `/admin/availability` | Operational placeholder — replace with Michelle's real hours |
| Legacy testimonial text | `/admin/reviews` | The one quote supplied in the design brief; label it as she prefers, or remove it once real verified reviews exist |
| Cash-payment note | `/admin/content` → Sessions | Matches the brief's approved wording; already marked approved |
| Hero copy, session-path cards | `/admin/content` → Homepage hero | Matches the approved "Option 3" copy exactly; already marked approved |

Everything in `/admin/content` that isn't yet checked "Approved for the live site" still displays (using the same text as a fallback) so the site never looks broken — but treat the checkbox as your signal for "reviewed and confirmed," not just "text exists."

## 2. Before going live

- [ ] Set a **real, unique** `SESSION_SECRET` in production (never reuse the one from `.env.example` or local dev)
- [ ] Set `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` to Michelle's real credentials before running the production seed, then have her change the password from `/admin/settings` on first login
- [ ] Configure `RESEND_API_KEY` and a verified sending domain — until then, confirmation emails only get logged, not sent
- [ ] Replace the placeholder weekly availability with the real schedule
- [ ] Have a lawyer review `/privacy` and `/terms` (see table above)
- [ ] Confirm the credentials list and about bio with Michelle, then check "Approved" in `/admin/content`
- [ ] Decide whether to keep or remove the legacy testimonial

## 3. Test suite

```bash
npm test        # 17 unit + integration tests — timezone/DST math, double-booking prevention,
                 # buffer/notice windows, review-token single-use, cash-only enforcement
npm run test:e2e # 10 end-to-end tests — full booking journey (keyboard/ARIA-checked), admin
                 # auth guard, rate-limit-on-brute-force, live content edits, sign-out
```

Both suites were green as of this handoff. Notably verified:

- Several simultaneous booking requests for the identical slot: exactly one succeeds, the rest get a clean "no longer available" response — never a double-booking. This was genuinely tricky: Postgres's default isolation lets a naive "check, then insert" race under real concurrency (confirmed empirically — 3 of 5 concurrent requests got through before this was fixed), and `SERIALIZABLE` isolation, tried next, didn't reliably catch it either. The fix serializes booking writes through a Postgres advisory lock (`src/lib/db-lock.ts`) — verified with up to 6 truly concurrent requests, always producing exactly one appointment.
- Availability correctly shifts across the March/October `Europe/Brussels` DST transitions.
- A review link can be used exactly once; a second attempt with the same link is rejected.
- An unauthenticated request to any `/admin/*` page or the underlying Server Actions is redirected/blocked.
- Editing content or pricing in `/admin` is reflected on the public site on the next request — no rebuild needed.

## 4. Accessibility (WCAG 2.2 AA)

- Semantic headings throughout (verified via Playwright's accessibility-tree queries, not just visual review — this caught and fixed one real gap: form step headings were `<legend>` elements not exposed as headings to screen readers, now paired with a nested `<h2>`)
- Keyboard-only booking flow verified end to end (the e2e suite drives the whole journey without a mouse)
- Visible focus ring on every interactive element (`:focus-visible`, gold outline, checked against both the cream and dark backgrounds)
- 44px+ touch targets on all buttons, form fields and date/time pickers
- Reduced-motion respected: the homepage's scroll reveal only animates under `prefers-reduced-motion: no-preference`, and — this was a bug caught and fixed during build — content is never left invisible if JavaScript fails or hasn't hydrated yet (the "hidden" state is applied by script just before animating in, not baked into the initial render)
- Descriptive alt text / `aria-label`s on the portrait, office photo, and icon-only controls
- Labelled form fields and inline error messages (`role="alert"`) on the booking and review forms

What's still worth a real screen-reader pass (NVDA/VoiceOver) before launch, beyond automated checks: the multi-step booking wizard's step announcements, and the admin calendar/appointments tables on a small screen.

## 5. Privacy & security

- Passwords hashed with bcrypt (cost 12); consider migrating to Argon2 if you later add other admin accounts with varying risk profiles
- Admin session: signed JWT in an httpOnly, SameSite=Lax cookie (Secure in production) — no admin API route or Server Action is reachable without a valid session
- Rate limiting on login (by IP and by email) and on public booking/reschedule/cancel endpoints
- Spam protection on the booking form via an invisible honeypot field — no CAPTCHA, no extra tracking
- Sensitive fields (client email/phone/notes) are never sent in: public API responses, page source, email subject lines, or calendar (.ics) titles — the .ics event title is always the neutral "Appointment — Michelle Ihirwe"
- Reviews never store or expose appointment type, contact details, or anything else that could identify the reviewer beyond what they explicitly chose to share (first name, initials, or nothing)
- Audit log (`AuditEvent` table) records admin sign-ins and material booking/review status changes, without logging note content
- No analytics, ad pixels, or third-party trackers included
- `.env` is gitignored; only `.env.example` (placeholders only) is committed

## 6. Known limitations / good next iterations

- `about.credentials` is edited as raw JSON in `/admin/content` — functional, but a dedicated add/remove-row UI would be friendlier for non-technical editing
- Translations (FR/NL) are structurally supported (`WebsiteContent.locale`) but no French/Dutch copy has been written yet
- The admin calendar is a week-agenda view, not a full drag-and-drop calendar grid
- No automated screen-reader test — see the accessibility section above
- The booking advisory lock (see section 3) serializes all booking writes through one lock. This is the right trade-off for a single practitioner's volume — bookings are fast, so brief queuing under a realistic burst is imperceptible — but it does mean a genuinely pathological number of truly simultaneous unrelated bookings (tested: 10 at once, for unrelated future dates) can start timing out rather than all succeeding promptly. If booking volume ever grows enough for that to matter, narrow the lock to a per-day key instead of one global key.
