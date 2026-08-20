/**
 * Structured logging for the Claude-backed endpoints.
 *
 * Underscore-prefixed so Vercel doesn't treat it as a serverless function.
 *
 * Why this exists: the two recommendation endpoints call an expensive model,
 * and until now the only signal they emitted was console.error on failure. A
 * feature whose cost scales with traffic needs to say what it spent, or the
 * first sign of a problem is the bill.
 *
 * One JSON line per invocation, so it's greppable in `vercel logs` and can be
 * shipped to a log aggregator later without reparsing prose.
 *
 * Deliberately NOT added to the HTTP response body: the eval harness records
 * fixtures against these endpoints, and coupling the response contract to
 * telemetry would invalidate them on every change.
 */

/**
 * Structurally compatible with the SDK's `Usage`, which uses `| null` (not
 * `| undefined`) for the cache fields. Declaring our own keeps this module
 * free of SDK type imports while still accepting the real object.
 */
export interface UsageLike {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
}

export interface CallLog {
  endpoint: string;
  model: string;
  /** cache hit means we served a stored result and made no model call at all */
  cacheHit: boolean;
  latencyMs: number;
  usage?: UsageLike;
  outcome: 'ok' | 'model_error' | 'bad_output' | 'not_configured' | 'unauthorized';
  /** Free-form, e.g. how many locations went into the prompt. */
  meta?: Record<string, string | number | boolean | null>;
}

/**
 * Per-million-token rates, read from env so they can be corrected without a
 * deploy. Left unset by default on purpose -- a hardcoded price silently goes
 * stale and then every downstream number is wrong with no indication. If the
 * rates aren't configured we log tokens and omit cost, which is honest.
 */
function estimateCostUsd(model: string, usage?: UsageLike): number | null {
  if (!usage) return null;
  const inRate = Number(process.env[`RATE_IN_PER_MTOK_${model.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`] ?? process.env.RATE_IN_PER_MTOK ?? NaN);
  const outRate = Number(process.env[`RATE_OUT_PER_MTOK_${model.replace(/[^A-Z0-9]/gi, '_').toUpperCase()}`] ?? process.env.RATE_OUT_PER_MTOK ?? NaN);
  if (!Number.isFinite(inRate) || !Number.isFinite(outRate)) return null;
  const inTok = usage.input_tokens ?? 0;
  const outTok = usage.output_tokens ?? 0;
  return Number(((inTok / 1e6) * inRate + (outTok / 1e6) * outRate).toFixed(6));
}

export function logCall(entry: CallLog): void {
  const costUsd = estimateCostUsd(entry.model, entry.usage);
  const line = {
    evt: 'llm_call',
    ts: new Date().toISOString(),
    endpoint: entry.endpoint,
    model: entry.model,
    outcome: entry.outcome,
    cacheHit: entry.cacheHit,
    latencyMs: entry.latencyMs,
    inputTokens: entry.usage?.input_tokens ?? null,
    outputTokens: entry.usage?.output_tokens ?? null,
    cacheReadTokens: entry.usage?.cache_read_input_tokens ?? null,
    costUsd,
    ...entry.meta,
  };
  // Single line, stable key order, parseable. console.log rather than error so
  // successful calls don't pollute the error stream.
  console.log(JSON.stringify(line));
}
