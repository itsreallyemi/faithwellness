"use client";

import { setOwnAvatar, supabaseBrowser } from "./client";

const SIZE = 480;
const BUCKET = "avatars";

/** Crops the middle square of a photo and shrinks it to 480 × 480 JPEG, so uploads stay small and match. */
async function squareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No image"))), "image/jpeg", 0.85));
}

/** Removes every file in the person's folder except `keep`. */
async function clearOldPhotos(userId: string, keep?: string) {
  const storage = supabaseBrowser().storage.from(BUCKET);
  const { data } = await storage.list(userId);
  const old = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
  if (old.length) await storage.remove(old);
}

/** Returns an error message for the person, or null when it worked. */
export async function uploadProfilePhoto(file: File): Promise<string | null> {
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return "Please sign in again, then try once more.";

  let blob: Blob;
  try {
    blob = await squareJpeg(file);
  } catch {
    return "We couldn’t read that photo. Try a JPG or PNG.";
  }

  // A new name each time, so browsers don't keep showing the old photo.
  const path = `${userId}/photo-${Date.now()}.jpg`;
  const { error: uploadError } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (uploadError) return "The upload didn’t work. Please try again.";

  const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) return "Your photo uploaded, but we couldn’t save it to your profile. Please try again.";

  setOwnAvatar(url);
  await clearOldPhotos(userId, path);
  return null;
}

export async function removeProfilePhoto(): Promise<string | null> {
  const sb = supabaseBrowser();
  const { data: auth } = await sb.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return "Please sign in again, then try once more.";
  const { error } = await sb.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return "We couldn’t remove your photo. Please try again.";
  setOwnAvatar(null);
  await clearOldPhotos(userId);
  return null;
}
