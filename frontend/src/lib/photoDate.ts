import { Photo } from '../lib/supabase.ts';

/**
 * When a photo was taken, falling back to when it was uploaded.
 *
 * `taken_date` is the meaningful date for a travel photo, but the upload form
 * doesn't require it, so plenty of rows have none -- reading it blindly renders
 * "Invalid Date". `created_at` is NOT NULL, so it's always a usable fallback.
 */
export function photoDate(photo: Photo): string {
  const raw = photo.taken_date ?? photo.created_at;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? new Date(photo.created_at).toLocaleDateString()
    : parsed.toLocaleDateString();
}
