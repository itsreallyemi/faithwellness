"use client";

// Real bookings from the browser: load the client's own (RLS limits them to their rows), and book or cancel
// through the server, which handles Google Calendar.

import { BOOKING_SELECT, toProtoBooking, type BookingRow, type NewBooking } from "@/lib/bookings";
import { proto, type ProtoBooking } from "@/lib/prototype/store";
import { supabaseBrowser } from "./client";

export async function loadClientBookings(userId: string): Promise<ProtoBooking[]> {
  const { data } = await supabaseBrowser().from("bookings").select(BOOKING_SELECT).eq("client_id", userId);
  return ((data as BookingRow[] | null) ?? []).map(toProtoBooking);
}

const bookErrors: Record<string, string> = {
  taken: "That time was just taken, or is no longer free. Please pick another time.",
  "not-bookable": "This counselor isn’t taking online bookings right now. Send them a message instead.",
  "calendar-failed": "We couldn’t add the session to the counselor’s calendar, so nothing was booked. Please try again.",
  "signed-out": "Please sign in again, then book.",
  "own-profile": "You can’t book a session with yourself.",
};

/** Books with a real counselor. Returns the new booking, or an error message for the client. */
export async function bookReal(body: NewBooking): Promise<{ booking: ProtoBooking } | { error: string }> {
  try {
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json()) as { booking?: BookingRow; error?: string };
    if (!res.ok || !data.booking) return { error: bookErrors[data.error ?? ""] ?? "Something went wrong booking. Please try again." };
    const booking = toProtoBooking(data.booking);
    proto.saveRealBooking(booking, "booked");
    if (body.rescheduleOf) {
      const old = proto.snapshot()?.bookings.find((b) => b.id === body.rescheduleOf);
      if (old) proto.saveRealBooking({ ...old, status: "canceled" }, "canceled", "Rescheduled to a new time.");
    }
    return { booking };
  } catch {
    return { error: "Something went wrong booking. Please try again." };
  }
}

/** Cancels a real booking (as its client or its counselor). Returns true when it worked. */
export async function cancelReal(id: string, reason: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    const data = (await res.json()) as { booking?: BookingRow };
    if (!res.ok || !data.booking) return false;
    proto.saveRealBooking(toProtoBooking(data.booking), "canceled", reason || "Session canceled.");
    return true;
  } catch {
    return false;
  }
}
