const OBJECT_SEGMENT = '/storage/v1/object/public/';
const RENDER_SEGMENT = '/storage/v1/render/image/public/';

/**
 * Ask Supabase Storage for a resized copy of an image.
 *
 * The grid and sidebar render photos into boxes a few hundred pixels tall but
 * were loading the full-size originals, so a page of six photos could pull tens
 * of megabytes.
 *
 * NOTE: image transformation is a paid Supabase feature. If it isn't enabled on
 * the project the render endpoint 404s, which is why every caller should go
 * through <PhotoImage>, which falls back to the original URL on error.
 */
export function resizedImageUrl(url: string, width: number): string {
  if (!url.includes(OBJECT_SEGMENT)) return url;
  return `${url.replace(OBJECT_SEGMENT, RENDER_SEGMENT)}?width=${width}&quality=75`;
}
