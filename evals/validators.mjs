import {
  COORDINATE_TOLERANCE_DEGREES,
  lookupGazetteer,
  normalizePlace,
} from './gazetteer.mjs';

const SUGGESTION_KEYS = ['place', 'country', 'latitude', 'longitude', 'reason'];
const RESULT_KEYS = ['intro', 'suggestions'];

function check(name, passed, detail) {
  return { name, passed, detail };
}

function hasExactlyKeys(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, i) => key === [...keys].sort()[i]);
}

function parseJson(value) {
  if (typeof value !== 'string') return { value, error: null };
  try {
    return { value: JSON.parse(value), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : String(error) };
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A suggestion becomes exactly one map pin, so `place` must name exactly one
 * place. The first live run returned "Hiroshima and Miyajima",
 * "Stone Town, Zanzibar, Tanzania", and "Kyoto Prefecture's Miyama & the
 * Kumano Kodo, Wakayama, Japan" -- each of which pins a single coordinate for
 * two or more destinations, and the last of which buries the country inside
 * `place` while `country` is already its own field.
 *
 * Conjunctions and commas are the reliable signals. The `and` rule can in
 * principle reject a legitimate name ("Trinidad and Tobago"), but that is a
 * country rather than a destination pin, so the trade is worth it.
 */
function isSinglePlace(place, country) {
  if (typeof place !== 'string') return false;
  const trimmed = place.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes('&')) return false;
  if (/\band\b/i.test(trimmed)) return false;
  if (trimmed.includes(',')) return false;
  if (typeof country === 'string' && country.trim().length > 0) {
    // Only a TRAILING country is the "Stone Town, Zanzibar, Tanzania" shape.
    // Matching the country anywhere rejected "Mexico City"/Mexico on the second
    // live run, along with Panama City, Guatemala City, and Kuwait City. A
    // city-state repeating its country (Singapore, Monaco) is fine too.
    const sameName = trimmed.toLowerCase() === country.trim().toLowerCase();
    if (!sameName && new RegExp(`\\b${escapeRegExp(country.trim())}$`, 'i').test(trimmed)) {
      return false;
    }
  }
  return true;
}

function historyPlaceKeys(history) {
  const keys = new Set();
  for (const photo of history ?? []) {
    if (!photo || !photo.title || photo.title === 'Untitled') continue;
    keys.add(normalizePlace(photo.title));
    const reference = lookupGazetteer(photo.title, photo.country);
    if (reference) {
      keys.add(normalizePlace(reference.place));
      for (const alias of reference.aliases ?? []) keys.add(normalizePlace(alias));
    }
  }
  return keys;
}

function validateThresholdShape(value, endpoint, expectedPhotoCount) {
  const checks = [];
  if (endpoint === 'community') {
    checks.push(check('threshold schema', hasExactlyKeys(value, ['needsMoreData']), 'community threshold response has exactly needsMoreData'));
    checks.push(check('threshold response marker', value?.needsMoreData === true, 'expected needsMoreData: true'));
    checks.push(check('threshold response has no recommendations', !('suggestions' in (value ?? {})), 'no suggestions should be emitted below threshold'));
  } else {
    checks.push(check('threshold schema', hasExactlyKeys(value, ['needsMorePhotos', 'photo_count', 'required']), 'personal threshold response has exactly needsMorePhotos, photo_count, and required'));
    checks.push(check('threshold response marker', value?.needsMorePhotos === true, 'expected needsMorePhotos: true'));
    checks.push(check('threshold required count', value?.required === 3, 'expected required: 3'));
    checks.push(check('threshold photo count', value?.photo_count === expectedPhotoCount, `expected photo_count: ${expectedPhotoCount}`));
    checks.push(check('threshold response has no recommendations', !('suggestions' in (value ?? {})), 'no suggestions should be emitted below threshold'));
  }
  return checks;
}

/**
 * Validate the part of the endpoint contract that can be checked without a
 * model. Every check is returned individually so the report says what failed,
 * not merely that a case failed.
 */
export function validateResponse(rawResponse, history, options = {}) {
  const endpoint = options.endpoint ?? 'personal';
  const expectedKind = options.expectedKind ?? 'recommendations';
  const expectedPhotoCount = options.expectedPhotoCount ?? (history?.length ?? 0);
  // Fixture mode verifies against the offline gazetteer; the live pass injects
  // a geocoder-backed resolver instead. See evals/geocoder.mjs for why.
  const resolveReference = options.resolveReference ?? ((place, country) => {
    const entry = lookupGazetteer(place, country);
    return entry
      ? { latitude: entry.latitude, longitude: entry.longitude, source: 'gazetteer' }
      : null;
  });
  const referenceLabel = options.referenceLabel ?? `gazetteer tolerance: ${COORDINATE_TOLERANCE_DEGREES}°; unknown places are unverifiable`;
  const parsed = parseJson(rawResponse);
  const checks = [check('valid JSON', !parsed.error, parsed.error ?? 'parsed')];

  if (parsed.error) {
    return { passed: false, checks, value: null };
  }

  const value = parsed.value;
  if (expectedKind === 'needs-more') {
    checks.push(...validateThresholdShape(value, endpoint, expectedPhotoCount));
    return { passed: checks.every((item) => item.passed), checks, value };
  }

  checks.push(check('top-level schema', hasExactlyKeys(value, RESULT_KEYS), 'required keys are exactly intro and suggestions'));
  checks.push(check('intro is a string', typeof value?.intro === 'string' && value.intro.trim().length > 0, 'intro must be non-empty text'));
  checks.push(check('suggestion list is an array', Array.isArray(value?.suggestions), 'suggestions must be an array'));

  if (!Array.isArray(value?.suggestions)) {
    return { passed: false, checks, value };
  }

  checks.push(check('suggestion count 3-5', value.suggestions.length >= 3 && value.suggestions.length <= 5, `received ${value.suggestions.length}`));

  const historyKeys = historyPlaceKeys(history);
  const seen = new Set();
  let allSuggestionSchemas = true;
  let allCoordinatesInRange = true;
  let allCoordinatesMatch = true;
  let noDuplicates = true;
  let noHistoryRepeats = true;
  let allSinglePlaces = true;
  const coordinateDetails = [];

  for (const suggestion of value.suggestions) {
    const schemaOk = hasExactlyKeys(suggestion, SUGGESTION_KEYS)
      && typeof suggestion.place === 'string'
      && suggestion.place.trim().length > 0
      && typeof suggestion.country === 'string'
      && suggestion.country.trim().length > 0
      && typeof suggestion.reason === 'string'
      && suggestion.reason.trim().length > 0
      && typeof suggestion.latitude === 'number'
      && Number.isFinite(suggestion.latitude)
      && typeof suggestion.longitude === 'number'
      && Number.isFinite(suggestion.longitude);
    allSuggestionSchemas = allSuggestionSchemas && schemaOk;

    const rangeOk = typeof suggestion.latitude === 'number'
      && Number.isFinite(suggestion.latitude)
      && typeof suggestion.longitude === 'number'
      && Number.isFinite(suggestion.longitude)
      && suggestion.latitude >= -90
      && suggestion.latitude <= 90
      && suggestion.longitude >= -180
      && suggestion.longitude <= 180;
    allCoordinatesInRange = allCoordinatesInRange && rangeOk;

    const key = `${normalizePlace(suggestion.place)}|${normalizePlace(suggestion.country)}`;
    if (seen.has(key)) noDuplicates = false;
    seen.add(key);

    // Check both title normalization and gazetteer aliases (e.g. "NYC" and
    // "New York") so the repeat check is not defeated by a common alias.
    const matchingInput = [...historyKeys].some((historyKey) => historyKey === normalizePlace(suggestion.place));
    noHistoryRepeats = noHistoryRepeats && !matchingInput;

    allSinglePlaces = allSinglePlaces && isSinglePlace(suggestion.place, suggestion.country);

    const reference = resolveReference(suggestion.place, suggestion.country);
    const coordinateOk = Boolean(reference)
      && rangeOk
      && Math.abs(suggestion.latitude - reference.latitude) <= COORDINATE_TOLERANCE_DEGREES
      && Math.abs(suggestion.longitude - reference.longitude) <= COORDINATE_TOLERANCE_DEGREES;
    allCoordinatesMatch = allCoordinatesMatch && coordinateOk;
    coordinateDetails.push({
      place: suggestion.place,
      country: suggestion.country,
      reference: reference
        ? { latitude: reference.latitude, longitude: reference.longitude, source: reference.source ?? 'gazetteer' }
        : null,
      passed: coordinateOk,
    });
  }

  checks.push(check('suggestion item schema', allSuggestionSchemas, 'every item has exactly the required typed fields'));
  checks.push(check('coordinates in valid ranges', allCoordinatesInRange, 'latitude -90..90 and longitude -180..180'));
  checks.push(check('coordinates match named places', allCoordinatesMatch, referenceLabel));
  checks.push(check('place names a single place', allSinglePlaces, 'place must be one destination: no commas, "and", "&", or the country name'));
  checks.push(check('no duplicate suggestions', noDuplicates, 'place + country keys must be unique'));
  checks.push(check('no suggestions repeat history', noHistoryRepeats, 'suggestions must be new places'));

  return {
    passed: checks.every((item) => item.passed),
    checks,
    value,
    coordinateDetails,
  };
}

export function summarizeChecks(result) {
  return result.checks
    .filter((item) => !item.passed)
    .map((item) => `${item.name}: ${item.detail}`);
}

export function validateJudgeResult(rawJudge, expectedReasonCount = null) {
  const parsed = parseJson(rawJudge);
  const checks = [check('judge JSON', !parsed.error, parsed.error ?? 'parsed')];
  if (parsed.error) return { passed: false, checks, value: null };
  const value = parsed.value;
  const scoreFields = ['intro_pattern_score', 'reason_grounding_score', 'tone_score'];
  checks.push(check('judge schema', hasExactlyKeys(value, [...scoreFields, 'overall_score', 'explanation', 'reason_checks']), 'judge returned the declared structured fields'));
  for (const field of scoreFields) {
    checks.push(check(`judge ${field}`, Number.isInteger(value?.[field]) && value[field] >= 0 && value[field] <= 2, `${field} must be an integer from 0 to 2`));
  }
  checks.push(check('judge overall score', Number.isInteger(value?.overall_score) && value.overall_score >= 0 && value.overall_score <= 6, 'overall_score must be an integer from 0 to 6'));
  const reasonChecks = value?.reason_checks;
  checks.push(check('judge reason checks', Array.isArray(reasonChecks) && reasonChecks.length >= 1, 'reason_checks must contain one result per reason'));
  if (expectedReasonCount !== null) {
    checks.push(check('judge reason check count', Array.isArray(reasonChecks) && reasonChecks.length === expectedReasonCount, `expected ${expectedReasonCount} reason checks`));
  }
  const reasonChecksValid = Array.isArray(reasonChecks) && reasonChecks.every((item) => (
    hasExactlyKeys(item, ['score', 'note'])
      && Number.isInteger(item.score)
      && item.score >= 0
      && item.score <= 2
      && typeof item.note === 'string'
      && item.note.trim().length > 0
  ));
  checks.push(check('judge reason check schema', reasonChecksValid, 'each reason check has score 0-2 and a non-empty note'));
  const scoreDimensionsValid = scoreFields.every((field) => Number.isInteger(value?.[field]));
  checks.push(check('judge explanation', typeof value?.explanation === 'string' && value.explanation.trim().length > 0, 'explanation must be non-empty text'));

  // The judge grades each reason and explains itself -- what it is actually
  // good at -- but it does not do the arithmetic over those grades. Two
  // consecutive live runs returned reason_grounding_score 1 for [2,2,0,0,0],
  // failing an otherwise sound case on a rounding disagreement rather than on
  // output quality. The runner derives the aggregates instead.
  //
  // Rounding is to nearest, not down. Flooring made mixed quality score worse
  // than uniform mediocrity: [2,2,0,0,0] floored to 0 while [1,1,1,1,1] gave 1,
  // so two excellent reasons plus three weak ones was penalised harder than
  // five forgettable ones.
  let scored = value;
  if (reasonChecksValid && scoreDimensionsValid) {
    const mean = reasonChecks.reduce((sum, item) => sum + item.score, 0) / reasonChecks.length;
    const reasonScore = Math.round(mean);
    scored = {
      ...value,
      reason_grounding_score: reasonScore,
      overall_score: value.intro_pattern_score + reasonScore + value.tone_score,
      // Kept so the report still shows what the judge itself claimed.
      judgeReported: {
        reason_grounding_score: value.reason_grounding_score,
        overall_score: value.overall_score,
      },
    };
  }

  return { passed: checks.every((item) => item.passed), checks, value: scored };
}
