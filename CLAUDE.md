# FaithWellness — project brief for Claude Code

FaithWellness is a web app that connects people with pastoral and Christian counselors from local churches. Clients browse a public directory, book 30- or 60-minute video sessions and message their counselor. Counselors manage availability, connect Calendly and Google Calendar, and see upcoming sessions.

Responsive web only (desktop + mobile web). One codebase, two roles: **client** and **counselor** (plus **admin** later).

The approved designs are in `design/screens/` (one HTML file per screen). Match them closely: layout, copy, spacing, colors. `design/tokens.css` holds the design tokens.

## Stack (defaults — change only with a reason)

- **Next.js 15** (App Router, TypeScript, Server Actions) deployed on **Vercel**
- **Tailwind CSS v4**, with theme values taken from `design/tokens.css`
- **Supabase**: Postgres, Auth (email magic link + Google), Realtime (messaging), Row Level Security on every table
- **Resend** for transactional email
- **Calendly API v2** (OAuth app + webhooks) and **Google Calendar API v3** (OAuth, `calendar.events` + `calendar.freebusy` scopes)
- Payments (Stripe) are **out of scope for v1**: fees are displayed only

## Design rules

- Fonts: Fraunces (headings, 500) + Plus Jakarta Sans (UI/body) via `next/font/google`.
- Cream page background `#FAF7F2`, white cards, 28px card radius (24px on mobile), warm border `#EFE7DD`, soft shadow (see tokens).
- **Primary button = peach `#FF7A59` fill with slate `#2D3748` text.** Never white text on peach (fails contrast).
- Links / active text use `#B34A2A`. Certification badges use sage `#2F6B4F` on `#E3F1E8`.
- Touch targets ≥ 44px. Real `<button>`, `<a>`, `<label>` elements. WCAG AA contrast.
- No emoji, no gradients. Icons: lucide-react, stroke 1.8.
- Headshots: rounded-square frame (radius ≈ 30% of size), 3–6px white border. Use initials fallback until a photo is uploaded.
- Every client-facing page shows the crisis notice: "FaithWellness isn't an emergency service. In the US, call or text 988, or call 911."

## Screens → routes

| Design file | Route | Role |
|---|---|---|
| Directory-Desktop / Directory-Mobile | `/counselors` (also `/`) | public |
| Profile-Desktop, Counselor-Profiles | `/counselors/[slug]` | public |
| Messaging-Desktop / Messaging-Mobile | `/messages`, `/messages/[threadId]` | client + counselor |
| Settings-Desktop / Settings-Mobile | `/portal/settings` | counselor |
| (dashboard, sessions) | `/portal`, `/portal/sessions` | counselor |
| Main | component reference only | — |
| Booking-Flow | `docs/booking-engine.md` | — |

## Data model (Supabase / Postgres)

- `profiles` (id = auth user id, role: client|counselor|admin, full_name, avatar_url, time_zone)
- `churches` (id, name, city, denomination)
- `counselors` (id → profiles, slug, title, church_id, years_ministry, languages[], about, approach, verse, verse_ref, fee_30_cents, fee_60_cents, offers_30, offers_60, sliding_scale, is_published)
- `credentials` (counselor_id, label, issuer, year)
- `focus_areas` + `counselor_focus_areas` (marriage, trauma, abuse recovery, financial, grief, anxiety, ministry burnout…)
- `integrations` (counselor_id, provider: calendly|google, access_token_enc, refresh_token_enc, expires_at, external_user_uri, status)
- `event_type_links` (counselor_id, duration 30|60, calendly_event_type_uri)
- `bookings` (id, counselor_id, client_id, start_utc, end_utc, duration, status: confirmed|canceled|conflict, calendly_invitee_uri UNIQUE, calendly_event_uri, google_event_id, rest_block_event_id, meet_url)
- `threads` (id, counselor_id, client_id) and `messages` (thread_id, sender_id, body, created_at, read_at)
- `webhook_events` (id, provider, external_id UNIQUE, payload, processed_at) — for idempotency

Encrypt OAuth tokens at rest (pgsodium / Supabase Vault or app-level AES-GCM). All times stored in UTC; render in the viewer's IANA time zone.

## Booking engine (summary — full detail in docs/booking-engine.md)

- Sessions are 30 or 60 min. **A 15-minute rest buffer after every session is mandatory and cannot be disabled.**
- Enforced in three places: Calendly event type after-buffer = 15, server-side filtering against Google freeBusy, and an opaque "Rest" event written to Google Calendar after each booking.
- Slot valid ⇔ no busy block `b` where `b.start < slot.end + 15m && b.end + 15m > slot.start`. Starts snap to :00/:15/:30/:45.
- On `invitee.created` webhook: verify signature → dedupe → re-check conflicts → create Google event with Meet (`conferenceDataVersion=1`) + rest block → post confirmation into the message thread + email.

## Privacy

Sessions may cover abuse and trauma. Never put client names or topics in calendar event titles (use "FaithWellness session"). Keep message content out of logs. RLS: a client sees only their own threads/bookings; a counselor only theirs.

## Working agreements

- Build in the phases listed in `START-HERE.md`; finish and demo each before the next.
- Seed data: the six sample counselors in `design/screens/Counselor-Profiles.dc.html` (fictional — replace before launch).
- Keep secrets in `.env.local`; list every variable in `.env.example`.
- Write tests for the slot/buffer logic (`lib/availability.ts`) before wiring APIs.
