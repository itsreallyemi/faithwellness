import "server-only";
import { emailOf, firstName, sendEmail, SITE, when } from "./email";
import { adminDb } from "./secrets";

// Who gets told what. Each function reads what it needs with the service role, then sends. They never throw.

async function counselorInfo(counselorId: string) {
  const { data } = await adminDb()
    .from("counselors")
    .select("preferred_name, slug, profile:profiles!inner(full_name, time_zone)")
    .eq("id", counselorId)
    .maybeSingle();
  const c = data as unknown as { preferred_name: string; slug: string; profile: { full_name: string; time_zone: string } } | null;
  return {
    name: c?.preferred_name || c?.profile.full_name || "your counselor",
    timeZone: c?.profile.time_zone ?? "",
    email: await emailOf(counselorId),
  };
}

type BookingFacts = {
  id: string;
  counselor_id: string;
  start_utc: string;
  duration: number;
  client_name: string;
  client_email: string;
  client_time_zone: string;
  meet_url: string;
};

async function bookingFacts(id: string) {
  const { data } = await adminDb()
    .from("bookings")
    .select("id, counselor_id, start_utc, duration, client_name, client_email, client_time_zone, meet_url")
    .eq("id", id)
    .maybeSingle();
  return data as BookingFacts | null;
}

/** A client just booked: confirm to them, and tell the counselor. */
export async function bookingConfirmed(bookingId: string, rescheduled: boolean) {
  try {
    const b = await bookingFacts(bookingId);
    if (!b) return;
    const c = await counselorInfo(b.counselor_id);
    await Promise.all([
      sendEmail({
        to: b.client_email,
        subject: `${rescheduled ? "New time confirmed" : "Session confirmed"} with ${c.name}`,
        body: `Hi ${firstName(b.client_name)},\n\nYour ${b.duration}-minute session with ${c.name} is ${rescheduled ? "moved to" : "booked for"} ${when(b.start_utc, b.client_time_zone)}.\n\nIt's by video on Google Meet. You'll also get a calendar invite from Google with the link.${b.meet_url ? `\n\nJoin here when it starts: ${b.meet_url}` : ""}\n\nYou can reschedule or cancel free of charge up to 24 hours before.`,
        button: { label: "See your session", href: `${SITE}/sessions/${b.id}` },
      }),
      sendEmail({
        to: c.email,
        subject: rescheduled ? `A session was moved to ${when(b.start_utc, c.timeZone)}` : `New session booked: ${when(b.start_utc, c.timeZone)}`,
        body: `Hi ${firstName(c.name)},\n\n${firstName(b.client_name)} ${rescheduled ? "moved their session to" : "booked a session for"} ${when(b.start_utc, c.timeZone)} (${b.duration} minutes). It's on your Google Calendar with the Meet link, followed by your 15-minute rest.`,
        button: { label: "Open your sessions", href: `${SITE}/portal/sessions` },
      }),
    ]);
  } catch (e) {
    console.error("bookingConfirmed email", e instanceof Error ? e.message : e);
  }
}

/** A session was canceled: tell whoever didn't cancel it. Google also emails the client its own update. */
export async function bookingCanceled(bookingId: string, by: "client" | "counselor", reason: string) {
  try {
    const b = await bookingFacts(bookingId);
    if (!b) return;
    const c = await counselorInfo(b.counselor_id);
    if (by === "client") {
      await sendEmail({
        to: c.email,
        subject: `Session canceled: ${when(b.start_utc, c.timeZone)}`,
        body: `Hi ${firstName(c.name)},\n\n${firstName(b.client_name)} canceled their session on ${when(b.start_utc, c.timeZone)}. It's been removed from your Google Calendar, and the time is open again.`,
        button: { label: "Open your sessions", href: `${SITE}/portal/sessions` },
      });
    } else {
      await sendEmail({
        to: b.client_email,
        subject: `${c.name} canceled your session`,
        body: `Hi ${firstName(b.client_name)},\n\n${c.name} canceled your session on ${when(b.start_utc, b.client_time_zone)}.${reason.trim() ? `\n\nTheir note: ${reason.trim()}` : ""}\n\nYou won't be charged. You can pick another time whenever you're ready.`,
        button: { label: `Book another time with ${c.name}`, href: `${SITE}/counselors` },
      });
    }
  } catch (e) {
    console.error("bookingCanceled email", e instanceof Error ? e.message : e);
  }
}

/** A client asked for a service (wedding, funeral…): tell the counselor. Details stay on the site. */
export async function serviceRequested(requestId: string) {
  try {
    const { data: r } = await adminDb().from("service_requests").select("counselor_id, service_name, client_name").eq("id", requestId).maybeSingle();
    if (!r) return;
    const c = await counselorInfo(r.counselor_id);
    await sendEmail({
      to: c.email,
      subject: `New request: ${r.service_name}`,
      body: `Hi ${firstName(c.name)},\n\n${firstName(r.client_name)} sent you a request for ${r.service_name.toLowerCase()} through FaithWellness. Read the details and reply from your portal.`,
      button: { label: "See the request", href: `${SITE}/portal/requests` },
    });
  } catch (e) {
    console.error("serviceRequested email", e instanceof Error ? e.message : e);
  }
}

/** The counselor accepted or declined a service request: tell the client. */
export async function serviceAnswered(requestId: string) {
  try {
    const { data: r } = await adminDb()
      .from("service_requests")
      .select("counselor_id, service_name, client_name, client_email, status")
      .eq("id", requestId)
      .maybeSingle();
    if (!r || (r.status !== "accepted" && r.status !== "declined")) return;
    const c = await counselorInfo(r.counselor_id);
    await sendEmail({
      to: r.client_email,
      subject: `${c.name} replied to your request`,
      body: `Hi ${firstName(r.client_name)},\n\n${c.name} ${r.status === "accepted" ? "accepted" : "replied to"} your request for ${r.service_name.toLowerCase()}. Read their message on your account page.`,
      button: { label: "Read their reply", href: `${SITE}/account#requests` },
    });
  } catch (e) {
    console.error("serviceAnswered email", e instanceof Error ? e.message : e);
  }
}

/** FaithWellness reviewed a counselor application: tell the applicant what's next. */
export async function applicationDecided(applicationId: string) {
  try {
    const { data: a } = await adminDb()
      .from("counselor_applications")
      .select("full_name, email, status, admin_note")
      .eq("id", applicationId)
      .maybeSingle();
    if (!a) return;
    const hi = `Hi ${firstName(a.full_name)},`;
    if (a.status === "approved") {
      await sendEmail({
        to: a.email,
        subject: "You're approved on FaithWellness",
        body: `${hi}\n\nGood news: we've confirmed your accreditation and approved your application.\n\nSign in with this email address to set up your profile, hours and fees, and connect Google Calendar. Your profile goes live as soon as it's complete.\n\nWelcome to FaithWellness.`,
        button: { label: "Open your counselor portal", href: `${SITE}/portal` },
      });
    } else if (a.status === "needs_info") {
      await sendEmail({
        to: a.email,
        subject: "A question about your FaithWellness application",
        body: `${hi}\n\nThank you for applying to FaithWellness. Before we can finish reviewing your application, we need a little more information:\n\n${a.admin_note}`,
        button: { label: "Update your application", href: `${SITE}/for-counselors#apply` },
      });
    } else if (a.status === "declined") {
      await sendEmail({
        to: a.email,
        subject: "Your FaithWellness application",
        body: `${hi}\n\nThank you for applying to FaithWellness. We're not able to approve your application at this time.\n\n${a.admin_note}\n\nIf you have questions, just reply to this email.`,
      });
    }
  } catch (e) {
    console.error("applicationDecided email", e instanceof Error ? e.message : e);
  }
}

/**
 * The daily reminder run: emails both people about each confirmed session starting in the next 36 hours that
 * hasn't been reminded yet. Sessions booked within 12 hours of starting are skipped, since their confirmation
 * just arrived. Returns how many sessions were reminded.
 */
export async function sendSessionReminders(now = new Date()) {
  const db = adminDb();
  const until = new Date(now.getTime() + 36 * 3_600_000);
  const { data } = await db
    .from("bookings")
    .select("id, counselor_id, start_utc, created_at, duration, client_name, client_email, client_time_zone, meet_url")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gt("start_utc", now.toISOString())
    .lte("start_utc", until.toISOString());
  let sent = 0;
  for (const b of (data ?? []) as (BookingFacts & { created_at: string })[]) {
    // Mark first, so a slow or failed email never leads to a second reminder.
    await db.from("bookings").update({ reminder_sent_at: now.toISOString() }).eq("id", b.id).is("reminder_sent_at", null);
    if (new Date(b.start_utc).getTime() - new Date(b.created_at).getTime() < 12 * 3_600_000) continue;
    try {
      const c = await counselorInfo(b.counselor_id);
      await Promise.all([
        sendEmail({
          to: b.client_email,
          subject: `Reminder: your session with ${c.name}`,
          body: `Hi ${firstName(b.client_name)},\n\nA reminder that your ${b.duration}-minute session with ${c.name} is ${when(b.start_utc, b.client_time_zone)}.${b.meet_url ? `\n\nJoin on Google Meet when it starts: ${b.meet_url}` : ""}\n\nFind a quiet, private spot where you can talk freely. Need to change it? You can reschedule or cancel from your session page.`,
          button: { label: "See your session", href: `${SITE}/sessions/${b.id}` },
        }),
        sendEmail({
          to: c.email,
          subject: `Reminder: session ${when(b.start_utc, c.timeZone)}`,
          body: `Hi ${firstName(c.name)},\n\nA reminder that you're meeting ${firstName(b.client_name)} ${when(b.start_utc, c.timeZone)} (${b.duration} minutes).${b.meet_url ? `\n\nGoogle Meet: ${b.meet_url}` : ""}`,
          button: { label: "Open your sessions", href: `${SITE}/portal/sessions` },
        }),
      ]);
      sent++;
    } catch (e) {
      console.error("Reminder email", e instanceof Error ? e.message : e);
    }
  }
  return sent;
}

/** FaithWellness reviewed a church registration: tell the person who registered. */
export async function churchApplicationDecided(applicationId: string) {
  try {
    const { data: a } = await adminDb()
      .from("church_applications")
      .select("org_name, contact_name, email, status, admin_note, church:churches(slug)")
      .eq("id", applicationId)
      .maybeSingle();
    if (!a) return;
    const app = a as unknown as { org_name: string; contact_name: string; email: string; status: string; admin_note: string; church: { slug: string } | null };
    const hi = `Hi ${firstName(app.contact_name)},`;
    if (app.status === "approved") {
      await sendEmail({
        to: app.email,
        subject: `${app.org_name} is on FaithWellness`,
        body: `${hi}\n\nWelcome. We've approved ${app.org_name}, and your church dashboard is ready.\n\nSign in with this email address to approve members, share your member code, and see your church's counselors.`,
        button: { label: "Open your church dashboard", href: app.church ? `${SITE}/church/${app.church.slug}` : `${SITE}/for-churches` },
      });
    } else if (app.status === "needs_info") {
      await sendEmail({
        to: app.email,
        subject: `A question about ${app.org_name}'s registration`,
        body: `${hi}\n\nThank you for registering ${app.org_name} with FaithWellness. Before we can finish, we need a little more information:\n\n${app.admin_note}`,
        button: { label: "Update your registration", href: `${SITE}/for-churches#register` },
      });
    } else if (app.status === "declined") {
      await sendEmail({
        to: app.email,
        subject: `${app.org_name}'s FaithWellness registration`,
        body: `${hi}\n\nThank you for registering ${app.org_name} with FaithWellness. We're not able to approve it at this time.\n\n${app.admin_note}\n\nIf you have questions, just reply to this email.`,
      });
    }
  } catch (e) {
    console.error("churchApplicationDecided email", e instanceof Error ? e.message : e);
  }
}
