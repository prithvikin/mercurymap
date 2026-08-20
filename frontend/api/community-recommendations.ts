import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
// No file extension: this directory compiles with TypeScript 4.7 + node
// resolution, which rejects explicit .ts extensions in imports.
import { logCall } from './_observability';

// Same reasoning as /api/recommendations.ts: below this there isn't enough
// signal in the community's public photos to say anything, so don't spend a
// call telling visitors we don't know yet.
const MIN_PHOTOS = 3;

// Cap on how many places we describe to the model, so prompt size stays
// bounded no matter how many public photos accumulate.
const MAX_LOCATIONS = 50;

// There's no per-visitor identity to key a cache off of, so this endpoint
// keeps one global row and regenerates it at most this often. That's what
// keeps an unauthenticated, unrate-limited endpoint cheap: worst case is one
// extra Claude call per day, no matter how much anonymous traffic hits it.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const CACHE_ROW_ID = 'global';

// Named so telemetry and the API call can't drift apart.
const MODEL = 'claude-opus-5';

interface Suggestion {
  place: string;
  country: string;
  latitude: number;
  longitude: number;
  reason: string;
}

interface RecommendationResult {
  intro: string;
  suggestions: Suggestion[];
}

// Raw JSON Schema for the same reason as the personal endpoint: zod v4 needs
// TypeScript 5, and react-scripts 5 ships an older compiler than Vercel's
// cloud build, so local and deployed builds would otherwise disagree.
const RECOMMENDATION_SCHEMA: { [key: string]: unknown } = {
  type: 'object',
  properties: {
    intro: { type: 'string' },
    suggestions: {
      type: 'array',
      // The structured-output API only accepts minItems of 0 or 1, and
      // doesn't support maxItems at all, for arrays -- so "3 to 5" is
      // enforced by the prompt and the runtime checks below, not the schema.
      minItems: 1,
      items: {
        type: 'object',
        properties: {
          place: { type: 'string' },
          country: { type: 'string' },
          latitude: { type: 'number' },
          longitude: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['place', 'country', 'latitude', 'longitude', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['intro', 'suggestions'],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are the travel recommendation engine for MercuryMap, a photo-mapping app.

You are given the list of places the whole community has publicly photographed. You're writing for a visitor who hasn't uploaded anything yet, so this isn't personalized -- it's a snapshot of where MercuryMap's travelers have actually been, framed as inspiration.

Rules:
- "intro" is one or two warm, conversational sentences characterizing the community's travel pattern so far -- e.g. "MercuryMap's travelers are drawn to coastal cities" or "This community loves a bit of adrenaline". Talk about "the community" / "travelers here", not "you".
- Suggest 3 to 5 destinations drawn from or clearly in the spirit of what's already been photographed.
- Each "reason" is a single sentence tying the suggestion to something concrete in the community's photos.
- Latitude and longitude must be the real coordinates of the place you name, since the app drops a map pin there.
- Prefer specific places -- a city, region, or national park -- over whole countries.
- If the photos are thin or scattered with no clear pattern, say so honestly in the intro and suggest broadly appealing places rather than inventing a theme.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startedAt = Date.now();
  const { ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = (
      ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const
    ).filter((name) => !process.env[name]);
    console.error('Missing required environment variables:', missing.join(', '));
    return res.status(500).json({ error: 'Server is not configured', missing });
  }

  // No caller identity here -- this is a public, unauthenticated endpoint.
  // It uses the service role key (bypasses RLS) because it's the only thing
  // that ever touches community_recommendations, and because the public
  // photos it reads are meant to be world-readable anyway.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('title, country, latitude, longitude')
      .is('user_id', null);

    if (photosError) throw photosError;

    // "Untitled" is the upload fallback when the geocoder gave us no city, so
    // those rows carry no place signal worth sending.
    const seen = new Set<string>();
    const locations = (photos ?? [])
      .filter(
        (p) =>
          p.title &&
          p.title !== 'Untitled' &&
          p.latitude != null &&
          p.longitude != null
      )
      .filter((p) => {
        const key = `${p.title}|${p.country}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, MAX_LOCATIONS);

    if (locations.length < MIN_PHOTOS) {
      return res.status(200).json({ needsMoreData: true });
    }

    const { data: cached } = await supabase
      .from('community_recommendations')
      .select('intro, suggestions, source_photo_count, created_at')
      .eq('id', CACHE_ROW_ID)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
      const ageMs = Date.now() - new Date(cached.created_at).getTime();
      logCall({
        endpoint: 'community-recommendations',
        model: MODEL,
        cacheHit: true,
        latencyMs: Date.now() - startedAt,
        outcome: 'ok',
        meta: { cacheAgeMs: ageMs, locations: locations.length },
      });
      return res.status(200).json({ ...cached, cached: true });
    }

    const locationList = locations
      .map(
        (p) =>
          `- ${p.title}, ${p.country} (${Number(p.latitude).toFixed(2)}, ${Number(
            p.longitude
          ).toFixed(2)})`
      )
      .join('\n');

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: RECOMMENDATION_SCHEMA },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are the ${locations.length} places MercuryMap's community has photographed:\n\n${locationList}\n\nWhat should a new visitor consider for their next trip?`,
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.error('No text block in response, stop_reason:', message.stop_reason);
      return res
        .status(502)
        .json({ error: 'Could not generate recommendations, please try again' });
    }

    let result: RecommendationResult;
    try {
      result = JSON.parse(textBlock.text);
    } catch (parseError) {
      console.error('Response was not valid JSON:', parseError);
      return res
        .status(502)
        .json({ error: 'Could not generate recommendations, please try again' });
    }

    if (
      typeof result?.intro !== 'string' ||
      !Array.isArray(result?.suggestions) ||
      result.suggestions.length === 0
    ) {
      console.error('Response did not match the expected shape');
      return res
        .status(502)
        .json({ error: 'Could not generate recommendations, please try again' });
    }

    // maxItems isn't enforceable in the schema itself, so clamp here.
    result.suggestions = result.suggestions.slice(0, 5);

    const { error: writeError } = await supabase.from('community_recommendations').upsert(
      {
        id: CACHE_ROW_ID,
        intro: result.intro,
        suggestions: result.suggestions,
        source_photo_count: locations.length,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    // A failed cache write shouldn't cost the visitor the result already generated.
    if (writeError) {
      console.error('Failed to cache community recommendations:', writeError.message);
    }

    logCall({
      endpoint: 'community-recommendations',
      model: MODEL,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
      usage: message.usage,
      outcome: 'ok',
      meta: { locations: locations.length, suggestions: result.suggestions.length },
    });

    return res.status(200).json({
      intro: result.intro,
      suggestions: result.suggestions,
      source_photo_count: locations.length,
      cached: false,
    });
  } catch (err) {
    console.error('Community recommendation generation failed:', err);
    logCall({
      endpoint: 'community-recommendations',
      model: MODEL,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
      outcome: 'model_error',
    });
    return res.status(500).json({ error: 'Could not generate recommendations' });
  }
}
