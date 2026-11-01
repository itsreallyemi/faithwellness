# Google app verification — what to submit

Google Cloud (signed in as faithwellnesscounseling@gmail.com, project **FaithWellness**) → **Google Auth Platform**.

## 1. Check before submitting

- **Branding**: app name `FaithWellness`, logo, support email.
  - Home page: `https://www.faithwellnesscounseling.com`
  - Privacy policy: `https://www.faithwellnesscounseling.com/privacy`
  - Terms of service: `https://www.faithwellnesscounseling.com/terms`
  - Authorized domain: `faithwellnesscounseling.com`
- **Audience**: User type **External**, publishing status **In production** (click **Publish app** if it still says Testing).
- **Data Access**: exactly these three sensitive scopes, nothing else Google flags:
  - `.../auth/calendar.events`
  - `.../auth/calendar.freebusy`
  - `.../auth/calendar.calendarlist.readonly`
- The privacy policy (live) has the Google Calendar section and the Limited Use statement.

## 2. Scope justifications (paste into the form)

**calendar.freebusy**
> FaithWellness lets clients book video counseling sessions with pastoral and Christian counselors. When a counselor connects Google Calendar, FaithWellness checks the busy times on the calendars they choose, so clients are only offered times when the counselor is actually free. We read busy/free blocks only, never the titles or details of the counselor's other events. This is checked when clients view times and again at the moment of booking to prevent double bookings.

**calendar.events**
> When a client books a session, FaithWellness creates one event on the calendar the counselor chose: titled only "FaithWellness session" (never the client's name or topic), with a Google Meet link, and the client invited as a guest so they receive the invitation. We also add a 15-minute "Rest" event after each session, which our platform requires so counselors always have a break between sessions. When a session is canceled or rescheduled, we delete the events we created. We only create, change or delete events that FaithWellness made.

**calendar.calendarlist.readonly**
> After connecting, counselors choose which of their calendars to check for conflicts (for example a personal and a church calendar) and which calendar new sessions are added to. We read the list of calendar names to show these choices in their settings. We don't read the events on calendars they don't choose.

**Why narrower scopes don't work** (if asked)
> calendar.freebusy alone can't create sessions or Meet links; calendar.events.owned wouldn't let us add sessions to an existing calendar the counselor chooses; and calendar.readonly would give us access to event details we don't need. These three scopes are the minimum for checking availability, choosing calendars, and creating the session with its Meet link.

## 3. Demo video (2–3 minutes, upload to YouTube as **Unlisted**, paste the link)

Record your screen on the **live site** (www.faithwellnesscounseling.com) so the address bar shows the domain. Keep the browser address bar visible the whole time. No narration needed, but a sentence or two on screen helps.

1. **The app** (10 s): show the home page / counselor directory at www.faithwellnesscounseling.com. Scroll to the footer and show the Privacy link.
2. **Sign in as a counselor** (15 s): sign in as the test counselor (donizonstudio) and open **Counselor portal → Settings → Scheduling & calendar**.
   - If it's already connected, click **Disconnect** first so you can show connecting from the start.
3. **The Google consent screen** (30 s — the most important part): click **Connect Google Calendar**.
   - Show Google's screen with the app name **FaithWellness** and the permissions listed.
   - The URL bar should show **accounts.google.com** and, in the request, the client ID. Pause on the permissions list for a few seconds.
   - Click **Continue** to grant access.
4. **calendarlist.readonly in use** (15 s): back in settings, show the list of calendars under **"Check these calendars for conflicts"** and the **"Add sessions to"** choice. Save.
5. **freebusy in use** (30 s): open Google Calendar in another tab, add an event during the counselor's weekly hours. Back on the counselor's public profile, show that the time is no longer offered (and the 15 minutes either side).
6. **calendar.events in use** (40 s): sign in as a client in another browser (or private window), book a time with the counselor. Then show the counselor's Google Calendar: the **"FaithWellness session"** event with its **Google Meet** link and the **Rest** block after it.
7. **Cancel** (15 s): cancel the session from the client's session page, then show the event and rest block are gone from Google Calendar.
8. **Disconnect** (10 s): Settings → Disconnect, to show the counselor can revoke access.

## 4. Submit

Google Auth Platform → **Verification Center** → **Prepare for verification** (or **Submit for verification**). Fill in the justifications, the YouTube link, and any extra notes:

> FaithWellness is a directory and booking platform for church-based counseling. Only approved counselors connect Google Calendar; clients never grant calendar access. Event titles never include client names or session topics because sessions may involve sensitive personal matters.

Google usually replies by email within a few days to a few weeks, sometimes asking for a change or a clearer video. Reply in the same thread.
