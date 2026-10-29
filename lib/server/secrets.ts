import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Things only the server may touch: the Supabase service role (bypasses Row Level Security) and the key that
// encrypts Google tokens. Both come from environment variables that are never sent to the browser.

/** True when the server has everything it needs to connect calendars. */
export const calendarConfigured = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TOKEN_ENCRYPTION_KEY && process.env.GOOGLE_CLIENT_SECRET,
);

/** Supabase with full access. Server only, and only for what users can't be allowed to do themselves. */
export function adminDb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
}

function key() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  const buf = raw ? Buffer.from(raw, "base64") : null;
  if (!buf || buf.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded");
  return buf;
}

/** AES-256-GCM. Stored as "iv.tag.ciphertext", each base64. */
export function encrypt(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

export function decrypt(stored: string) {
  const [iv, tag, body] = stored.split(".").map((p) => Buffer.from(p, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}
