# Start here: building FaithWellness with Claude Code

## 1. Set up (one time, ~10 minutes)

1. Unzip this folder somewhere you keep projects, e.g. `~/Projects/faithwellness`.
2. Open a terminal in that folder and run `claude`.
3. Have these accounts ready (all have free tiers to start):
   - **GitHub** (code), **Vercel** (hosting), **Supabase** (database + login)
   - **Google Cloud Console** — create an OAuth client with the Google Calendar API enabled
   - **Resend** (email)

Claude Code reads `CLAUDE.md` automatically, so it already knows the stack, design rules and data model.

## 2. Paste this as your first message

> Read CLAUDE.md, START-HERE.md, docs/booking-engine.md and look at every file in design/screens/. Then do Phase 1 only: scaffold the Next.js app, set up Tailwind with the tokens from design/tokens.css, load Fraunces and Plus Jakarta Sans, and build the shared components (Button, Card, Badge, FilterChip, Avatar with initials fallback, CounselorCard, CrisisNotice) matching design/screens/Main.dc.html. Add a /styleguide page that shows them all. Tell me how to run it locally when you're done.

## 3. Phases (one at a time — review each in the browser before moving on)

1. **Foundations** — scaffold, tokens, fonts, shared components, `/styleguide`.
2. **Public directory + profile** — Supabase schema + seed the six sample counselors; `/counselors` with working filters (focus, denomination, church, fee, session length, sort); `/counselors/[slug]` profile page with the booking panel (static slots for now). Desktop and mobile layouts.
3. **Auth + roles** — Supabase Auth (magic link + Google), client vs counselor roles, RLS policies, protected `/portal`.
4. **Counselor portal** — `/portal/settings`: profile & fees, weekly hours, session types; upcoming sessions list.
5. **Integrations** — Google Calendar connect/disconnect card, token storage + refresh, choosing which calendars to check and write to.
6. **Booking engine** — `lib/availability.ts` with unit tests for the 15-min buffer; `/api/availability`; booking server action (conflict re-check in one transaction); Google event + Meet link + rest block; cancel/reschedule handling.
7. **Messaging** — threads, realtime messages (Supabase Realtime), booking confirmation cards in the thread, email notifications via Resend.
8. **Polish + launch** — accessibility pass, empty/error states, crisis notice everywhere, SEO for profiles, deploy to Vercel with production env vars.

## 4. Tips

- Ask Claude Code to "show me in the browser" or to explain any step you don't follow.
- Commit after each phase (`/commit` or ask Claude to commit).
- Before going live: replace the sample counselors, fill in real credentials, and review privacy (confidentiality notice, HIPAA if counselors are licensed clinicians — Google Workspace and Supabase both offer BAAs on paid plans).
