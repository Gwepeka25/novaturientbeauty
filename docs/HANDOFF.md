# Handoff: pre-launch checklist

This is the punch list for going from "code is done" to "real clients can book." Read this before telling Michelle the site is ready.

## 1. Decisions Michelle must approve before launch

Nothing below is fabricated — each is either a reasonable placeholder clearly marked as such, or an operational default that needs her sign-off, not a legal/content decision made on her behalf.

| Item | Where | Status |
| --- | --- | --- |
| Brand name | `src/lib/site-config.ts` | **Decided**: the site now shows both — "Novaturient Beauty" as the practice brand (header, footer, page titles, emails) and "Michelle Ihirwe, Sexologist & Intimacy Therapist" as the named practitioner. Not admin-editable on purpose; change it here if that ever needs to change. |
| Credentials (institutions, years) | `/admin/content` → About | Entered from the build brief; must be **verified** by Michelle before launch (not yet marked approved) |
| About bio paragraph | `/admin/content` → About | Now uses wording pulled directly from her real novaturientbeauty.com "About Me" section — should be a quick confirm rather than a rewrite, but still needs the "Approved" checkbox |
| Areas of focus / specialties | `/admin/content` → About (`about.specialties`) | Pulled from her real Doctoranytime profile (Addictions, Female/Male Sexual Disorder, Vaginismus, Desire disorder, Difficulty communicating with partner, Sexuality problems, Pregnancy follow-up, Harassment) — confirm this list is current before approving |
| Legacy testimonial | `/admin/reviews` | Still the one placeholder quote from the design brief. Her real site has 3 real testimonials (Marie, Gwenn, Isabelle) — swap these in once you have the exact text; don't invent quotes |
| Contact email & phone | `/admin/content` → Contact | Placeholder (`hello@example.com`, blank phone) — must be replaced (likely `michelle@novaturientbeauty.com`, to be confirmed) |
| Privacy Policy | `/privacy` | **Draft, explicitly labeled "needs legal review"** — now structured (data controller, legal basis, processors, GDPR rights) so a lawyer's review is faster, but every bracketed `[placeholder]` (retention period, in particular) is still a real decision, not something to launch with as-is |
| Terms & Cancellation Policy | `/terms` | **Draft, explicitly labeled "needs legal review"** — same as above; cancellation window (currently 24h), no-show fee, liability wording, and governing law are all left as explicit `[placeholder]`s for Michelle + a lawyer |
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
npm test        # 42 unit + integration tests — timezone/DST math, double-booking prevention,
                 # buffer/notice windows, review-token single-use, cash-only enforcement,
                 # revenue/expense/profit/insight calculations, reminder-email scheduling,
                 # client-portal magic-link auth
npm run test:e2e # 12 end-to-end tests — full booking journey (keyboard/ARIA-checked), admin
                 # auth guard, rate-limit-on-brute-force, live content edits, expense entry,
                 # sign-out
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

## 6. Finances & business insights (`/admin/finances`)

Beyond booking management, Michelle has a real profit/loss view:

- **Revenue** counts completed sessions at the price actually charged when booked (`Appointment.priceCentsAtBooking`) — a later price change never rewrites past revenue.
- **Expenses** are logged manually (rent, supplies, marketing, software, insurance, training, other) — there is no bank/accounting integration.
- **Profit** = revenue minus logged expenses, for whichever period is selected (this month / last 3 months / this year / all time).
- **Breakdowns**: revenue by service, in-person vs. online (including their relative cancellation rates), new vs. returning clients, a monthly revenue chart, and cancellation/no-show rates.
- **Insights** are rule-based observations computed directly from her real data (e.g. a high cancellation rate, which service earns the most per session, her busiest day) — never invented, and the panel explicitly says "not enough history yet" below 5 completed sessions rather than drawing conclusions from a handful of appointments. See `src/lib/analytics.ts` for exactly what each insight checks and its threshold.

This intentionally does not fabricate a rating/scoring system for the practice — every number traces to a real row in the database.

## 7. Client portal (`/portal`)

Clients don't have passwords — they enter their email, get a single-use sign-in link (expires in 30 minutes), and land on a page listing their upcoming and past appointments (`src/lib/portal-auth.ts`, `src/lib/client-session.ts`). The response to a link request is identical whether or not the email matches a client, and only known clients actually get emailed, so this can't be used to check who is or isn't a client, nor to spam an arbitrary inbox.

Each completed appointment has a **downloadable/printable receipt** (`/portal/receipt/[id]`) showing the practice details, session, date, duration, format, payment method, and amount — genuinely useful for clients claiming partial reimbursement from a Belgian mutuality. Authorization is checked on every receipt view (the signed-in email must match the appointment's), and a mismatch or a not-yet-completed appointment both return a plain 404, never a hint about what exists.

## 8. Day-before reminder emails

A reminder email goes out roughly 24 hours before each confirmed appointment, sent by an in-process scheduler that starts when the server boots (`src/instrumentation.ts` + `src/lib/reminders.ts`) — no external cron service to configure. `Appointment.reminderSentAt` guarantees it's sent at most once per appointment even if the scheduler's periodic check overlaps itself.

## 9. Known limitations / good next iterations

- `about.credentials` is edited as raw JSON in `/admin/content` — functional, but a dedicated add/remove-row UI would be friendlier for non-technical editing
- Translations (FR/NL) are structurally supported (`WebsiteContent.locale`) but no French/Dutch copy has been written yet
- The admin calendar is a week-agenda view, not a full drag-and-drop calendar grid
- Finances insights are deterministic rules over the data (see `generateInsights` in `src/lib/analytics.ts`), not AI-generated commentary — predictable and free to run, but a future iteration could layer an LLM-written summary on top of the same real numbers if that's ever wanted
- No expense receipt/attachment upload — expenses are amount + category + description only
- No automated screen-reader test — see the accessibility section above
- The booking advisory lock (see section 3) serializes all booking writes through one lock. This is the right trade-off for a single practitioner's volume — bookings are fast, so brief queuing under a realistic burst is imperceptible — but it does mean a genuinely pathological number of truly simultaneous unrelated bookings (tested: 10 at once, for unrelated future dates) can start timing out rather than all succeeding promptly. If booking volume ever grows enough for that to matter, narrow the lock to a per-day key instead of one global key.
- The reminder-email scheduler is a plain `setInterval` in the running process (see section 8), same deploy assumption as the booking lock: one long-lived Node instance. It would need to move to a real job queue if this ever runs as multiple instances.
- The client portal has no rate limit on how many appointments/receipts a signed-in session can view — acceptable for a solo practice's realistic volume, but worth revisiting if that changes.
