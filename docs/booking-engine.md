# Booking engine — Calendly, 15-minute buffer, Google Meet

Lanes: Client (browser) · FaithWellness Web (Next.js) · FaithWellness API (route handlers + Postgres + job queue) · Google Calendar API v3 · Calendly API v2.

## A. Counselor connects accounts (once)

| # | From → To | What | Call |
|---|---|---|---|
| A1 | Web → API | Counselor connects Google + Calendly | OAuth 2.0 (Google scopes `calendar.events`, `calendar.freebusy`; Calendly `auth.calendly.com/oauth/authorize`). Store tokens encrypted; refresh job. |
| A2 | API → Calendly | Sync event types, map 30/60 min, verify after-event buffer = 15 | `GET /event_types?user={user_uri}` — if buffer ≠ 15, show a fix-it prompt in settings |
| A3 | API → Calendly | Subscribe to booking events | `POST /webhook_subscriptions` `{url, events:["invitee.created","invitee.canceled"], organization, user, scope:"user", signing_key}` |

Counselor picks which Google calendars to check for conflicts and which one sessions are written to.

**Avoid duplicate events:** if Calendly is also set to add events to the same Google calendar, sessions appear twice. Either (a) let Calendly create the event and use its native Google Meet location (link arrives in the webhook as `scheduled_event.location.join_url`), or (b) point Calendly's "add to calendar" at a separate calendar and let FaithWellness create the Meet event. Pick one per deployment; (b) is described below.

## B. Client books a session

1. Client taps "Book 60 min". Browser time zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. Web → API: `GET /api/availability?counselor={id}&duration=60&tz=Asia/Tokyo&from=…`
3. API → Calendly: `GET /event_type_available_times?event_type={uri}&start_time&end_time` (max 7-day window; already honors Calendly buffers).
4. API → Google: `POST /calendar/v3/freeBusy` for every checked calendar.
5. API merges: pad every busy block by 15 min, drop overlapping candidates, snap to 15-min grid, convert UTC → client TZ. Returns `[{start, end}]`.
6. Web shows slots; client confirms in the **Calendly inline embed** (prefill name/email; pass `utm_content=booking_ref` to correlate).
7. Calendly → API: webhook `invitee.created`.
   - Verify `Calendly-Webhook-Signature` header (`t=…,v1=…`, HMAC-SHA256 of `t + "." + rawBody` with the signing key; reject if older than 5 min).
   - Return 2xx immediately; process on a queue.
8. Guard: insert into `webhook_events` (unique on invitee URI) → skip duplicates. Re-run freeBusy with buffer. On conflict: `POST /scheduled_events/{uuid}/cancellation` with a reason, set booking `status=conflict`, message the client with alternative times.
9. API → Google: `events.insert` (`conferenceDataVersion=1`, `conferenceData.createRequest = {requestId: bookingId, conferenceSolutionKey: {type: "hangoutsMeet"}}`), title "FaithWellness session" (no client details). Then insert an opaque 15-min "Rest" event right after.
10. Google returns `hangoutLink` → save `meet_url`.
11. API → Client: booking confirmed. Post a "Session confirmed" card into the message thread (realtime) and send email via Resend.

## The 15-minute rest rule

```
valid(slot) ⇔ no busy b where
  b.start < slot.end + 15m  &&  b.end + 15m > slot.start
```

Example: 9:00–10:00 session → rest 10:00–10:15 → earliest next start 10:15.

Three layers: Calendly after-event buffer (source of truth for the embed), server filter, and the Google "Rest" block (protects against bookings made outside FaithWellness).

## Edge paths

- `invitee.canceled` → delete Google event + rest block, mark booking canceled, note in thread.
- Reschedule → Calendly sends cancel + new `invitee.created`; link via `old_invitee`.
- Webhook retries → idempotent on invitee URI.
- Token expired / revoked → mark integration `needs_reconnect`, hide counselor from directory, email them.
- DST: always compute in UTC with IANA zones (use `date-fns-tz` or Temporal polyfill); never hard-code offsets.

## Tests to write first (`lib/availability.test.ts`)

- 60-min busy 9:00–10:00 blocks 9:45 and 10:00 starts; allows 10:15.
- 30-min slot squeezed between two sessions with < 15 min either side is rejected.
- Slots convert correctly across a DST change (e.g. US clocks back on Nov 1, 2026).
- Counselor in Los Angeles, client in Tokyo: 10:00 Tue JST ↔ 6:00 PM Mon PDT.
