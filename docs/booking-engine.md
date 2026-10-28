# Booking engine — Google Calendar, 15-minute rest, Google Meet

FaithWellness books sessions itself. There is no Calendly: availability comes from the counselor's weekly hours in FaithWellness plus their Google Calendar busy times, and FaithWellness writes the session (with a Meet link) and a rest block to their calendar.

Lanes: Client (browser) · FaithWellness Web (Next.js) · FaithWellness API (route handlers + Postgres + job queue) · Google Calendar API v3.

## A. Counselor connects Google Calendar (once)

| # | From → To | What | Call |
|---|---|---|---|
| A1 | Web → API | Counselor clicks Connect Google Calendar in `/portal/settings` | OAuth 2.0 with offline access. Scopes `calendar.events`, `calendar.freebusy`, `calendar.calendarlist.readonly`. Store tokens encrypted; refresh job. |
| A2 | API → Google | List their calendars | `GET /users/me/calendarList` |
| A3 | Web | Counselor picks which calendars to check for conflicts and which one sessions are written to | saved on `integrations` |

Weekly hours, session lengths (30/60), fees and time off are set in `/portal/settings` and stored in FaithWellness, not in Google.

## B. Client books a session

1. Client picks a length on the profile. Browser time zone from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
2. Web → API: `GET /api/availability?counselor={id}&duration=60&tz=Asia/Tokyo&from=…`
3. API builds candidate starts from the counselor's weekly hours (in the counselor's IANA zone), on a 15-minute grid, minus time off.
4. API → Google: `POST /calendar/v3/freeBusy` for every checked calendar.
5. API merges: pad every busy block by 15 min, drop overlapping candidates, convert UTC → client TZ. Returns `[{start, end}]`.
6. Web shows slots; client confirms on `/book/[slug]`.
7. Web → API: `POST /api/bookings` (server action). In one transaction:
   - Re-run freeBusy with the buffer and check `bookings` for overlaps (guards against two clients taking the same slot). On conflict, return the next open times instead.
   - Insert the booking as `confirmed`.
8. API → Google: `events.insert` on the counselor's chosen calendar (`conferenceDataVersion=1`, `conferenceData.createRequest = {requestId: bookingId, conferenceSolutionKey: {type: "hangoutsMeet"}}`), title "FaithWellness session" (no client details), client added as a guest only if they opted in. Then insert an opaque 15-min "Rest" event right after.
9. Google returns `hangoutLink` → save `meet_url`, `google_event_id`, `rest_block_event_id`.
10. API → Client: booking confirmed. Post a "Session confirmed" card into the message thread (realtime) and send email via Resend. Reminder email 24 hours before.

## The 15-minute rest rule

```
valid(slot) ⇔ no busy b where
  b.start < slot.end + 15m  &&  b.end + 15m > slot.start
```

Example: 9:00–10:00 session → rest 10:00–10:15 → earliest next start 10:15.

Two layers: the server filter (availability and the booking-time re-check), and the Google "Rest" block (protects against bookings the counselor makes outside FaithWellness).

## Edge paths

- Cancel → delete the Google event and rest block, mark the booking canceled, note in the thread, email both people.
- Reschedule → book the new time first (same checks), then cancel the old one; link them with `rescheduled_from`.
- Counselor deletes or moves the event in Google → nightly sync flags it so the counselor can confirm or cancel properly.
- Token expired / revoked → mark integration `needs_reconnect`, stop offering times (hide from directory), email the counselor.
- DST: always compute in UTC with IANA zones (use `date-fns-tz` or Temporal polyfill); never hard-code offsets.

## Later, if counselors ask

- Outlook / Microsoft 365 calendars through Microsoft Graph (`/me/calendar/getSchedule`, `/me/events` with Teams link) — same shape as Google.

## Tests to write first (`lib/availability.test.ts`)

- 60-min busy 9:00–10:00 blocks 9:45 and 10:00 starts; allows 10:15.
- 30-min slot squeezed between two sessions with < 15 min either side is rejected.
- Slots outside weekly hours, or during time off, are never offered.
- Slots convert correctly across a DST change (e.g. US clocks back on Nov 1, 2026).
- Counselor in Los Angeles, client in Tokyo: 10:00 Tue JST ↔ 6:00 PM Mon PDT.
