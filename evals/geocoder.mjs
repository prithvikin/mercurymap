/**
 * OpenCage-backed coordinate verification for the live pass.
 *
 * Why this exists: gazetteer.mjs holds 41 places, but the recommendation
 * endpoints exist to suggest somewhere the traveller has NOT been, drawn from
 * the whole world. Live output therefore lands outside the gazetteer almost
 * every time, and "unknown place is unverifiable" turned 27 correct answers
 * into regressions on the first live run while catching zero real errors.
 *
 * The gazetteer is still the right tool for fixture mode: offline, versioned,
 * and free. This module is the live-mode counterpart -- it verifies against the
 * same geocoder the product itself uses (LocationSearch calls OpenCage), so a
 * coordinate the eval accepts is one the app would resolve the same way.
 *
 * Results are cached on disk between runs. Place names repeat heavily across
 * cases, and an unnecessary network call is both slower and closer to the free
 * tier's daily ceiling.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(HERE, 'results', 'geocode-cache.json');
const ENDPOINT = 'https://api.opencagedata.com/geocode/v1/json';
// Bump when resolution logic changes. Entries written by older logic are
// discarded rather than trusted -- a cache full of country centroids from a
// previous run would silently mask the fix that stopped accepting them.
const CACHE_VERSION = 2;

export function geocoderApiKey() {
  return process.env.OPENCAGE_API_KEY ?? process.env.REACT_APP_OPENCAGE_API_KEY ?? null;
}

export function referenceKey(place, country) {
  return `${String(place ?? '').trim().toLowerCase()}|${String(country ?? '').trim().toLowerCase()}`;
}

function readCache() {
  try {
    const stored = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (stored?.version !== CACHE_VERSION) return {};
    return stored.entries ?? {};
  } catch {
    return {};
  }
}

function writeCache(entries) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify({ version: CACHE_VERSION, entries }, null, 2)}\n`);
}

/**
 * Resolve one place to a reference coordinate.
 *
 * Returns null for anything the geocoder cannot resolve. That stays a failure
 * upstream: a place no geocoder knows is exactly the hallucination the
 * coordinate check is meant to catch, and the app could not pin it either.
 */
/**
 * OpenCage answers an unmatched query with a low-confidence COUNTRY centroid
 * rather than an empty result: "Torres del Paine National Park, Chile" came
 * back as (-30, -71), the middle of Chile, and "Hermanus and the Cape Whale
 * Coast, South Africa" as (-29, 24). Accepting those as references failed two
 * correct answers on the second live run.
 *
 * `confidence` alone cannot separate them -- Singapore scores 1 because a
 * city-state has a huge bounding box, and it is perfectly correct. The
 * reliable signal is the result collapsing to the country itself.
 */
function isCountryFallback(result, place, country) {
  const sameName = String(place ?? '').trim().toLowerCase() === String(country ?? '').trim().toLowerCase();
  if (sameName) return false; // Singapore, Monaco: the country IS the place.
  if (result.components?._type === 'country') return true;
  return String(result.formatted ?? '').trim().toLowerCase() === String(country ?? '').trim().toLowerCase();
}

// "Torres del Paine National Park" does not match, but "Torres del Paine"
// resolves exactly. Dropping a trailing generic designator is enough to
// recover the legitimate non-city destinations the endpoints suggest.
const GENERIC_SUFFIX = /\s+(national\s+park|nature\s+reserve|national\s+monument|national\s+forest|park)$/i;

async function fetchOne(apiKey, query) {
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&limit=1&no_annotations=1&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) {
    // A rejected key returns a normal response body, so this must not be
    // confused with "no match" -- that would silently pass everything.
    throw new Error(`OpenCage returned ${response.status} ${response.statusText} for "${query}"`);
  }
  const body = await response.json();
  return body?.results?.[0] ?? null;
}

/**
 * Resolve one place to a reference coordinate.
 *
 * Returns null for anything that cannot be resolved to something more specific
 * than its country. That stays a failure upstream: a place no geocoder can
 * place is exactly the hallucination this check exists to catch, and the app
 * could not pin it either.
 */
async function geocodeOne(apiKey, place, country) {
  const base = String(place ?? '').trim();
  const queries = [country ? `${base}, ${country}` : base];

  const simplified = base.replace(GENERIC_SUFFIX, '').trim();
  if (simplified && simplified !== base) {
    queries.push(country ? `${simplified}, ${country}` : simplified);
  }

  for (const query of queries) {
    const first = await fetchOne(apiKey, query);
    if (!first?.geometry) continue;
    if (isCountryFallback(first, place, country)) continue;
    return {
      latitude: first.geometry.lat,
      longitude: first.geometry.lng,
      formatted: first.formatted ?? query,
      confidence: first.confidence ?? null,
      type: first.components?._type ?? null,
      query,
      source: 'opencage',
    };
  }

  return null;
}

/**
 * Resolve every suggestion, returning a Map keyed by referenceKey().
 *
 * Unresolvable places are stored as null so the cache records the negative and
 * a second run does not re-query them.
 */
export async function resolveSuggestions(suggestions, apiKey) {
  const cache = readCache();
  const table = new Map();
  let fetched = 0;

  for (const suggestion of suggestions ?? []) {
    const key = referenceKey(suggestion?.place, suggestion?.country);
    if (!(key in cache)) {
      cache[key] = await geocodeOne(apiKey, suggestion?.place, suggestion?.country);
      fetched += 1;
    }
    table.set(key, cache[key]);
  }

  if (fetched > 0) writeCache(cache);
  return table;
}
