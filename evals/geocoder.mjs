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

export function geocoderApiKey() {
  return process.env.OPENCAGE_API_KEY ?? process.env.REACT_APP_OPENCAGE_API_KEY ?? null;
}

export function referenceKey(place, country) {
  return `${String(place ?? '').trim().toLowerCase()}|${String(country ?? '').trim().toLowerCase()}`;
}

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`);
}

/**
 * Resolve one place to a reference coordinate.
 *
 * Returns null for anything the geocoder cannot resolve. That stays a failure
 * upstream: a place no geocoder knows is exactly the hallucination the
 * coordinate check is meant to catch, and the app could not pin it either.
 */
async function geocodeOne(apiKey, place, country) {
  const query = country ? `${place}, ${country}` : String(place);
  const url = `${ENDPOINT}?q=${encodeURIComponent(query)}&limit=1&no_annotations=1&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    // A rejected key returns a normal response body, so this must not be
    // confused with "no match" -- that would silently pass everything.
    throw new Error(`OpenCage returned ${response.status} ${response.statusText} for "${query}"`);
  }

  const body = await response.json();
  const first = body?.results?.[0];
  if (!first?.geometry) return null;

  return {
    latitude: first.geometry.lat,
    longitude: first.geometry.lng,
    formatted: first.formatted ?? query,
    source: 'opencage',
  };
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
