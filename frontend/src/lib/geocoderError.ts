/**
 * Turn a failed geocoding response into something worth showing a user.
 *
 * Both geocoders answer a bad key with a normal HTTP response rather than a
 * network error, so `fetch` resolves and only `response.ok` distinguishes it
 * from a real result. Callers that skip that check show an empty dropdown,
 * which reads as "no such place" -- the failure mode that made an expired
 * OpenCage key look like a broken search box.
 *
 * Messages stay vague about credentials on purpose: a visitor can't act on
 * "invalid API key", and the specifics belong in the console, not the UI.
 */
export function geocoderErrorMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'Location search is unavailable right now.';
  }
  if (status === 402 || status === 429) {
    return 'Too many searches just now — try again in a moment.';
  }
  return "Couldn't reach the location service.";
}

export const GEOCODER_NETWORK_ERROR = 'Check your connection and try again.';
