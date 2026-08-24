import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
// No file extension here on purpose: unlike frontend/src (webpack), this
// directory compiles with TypeScript 4.7 + node resolution, which rejects
// explicit .ts extensions in imports.
import { logCall } from './_observability';

// Named so telemetry and the API call can't drift apart.
const MODEL = 'claude-opus-5';

// Below this, there isn't enough signal to infer a taste -- and we don't want
// to spend an API call to tell someone we don't know them yet.
const MIN_PHOTOS = 3;

// Cap on how many places we describe to the model, so prompt size stays bounded
// no matter how many photos a user uploads.
const MAX_LOCATIONS = 50;

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

// Structured-output schema written as raw JSON Schema rather than via zod.
// zod v4's type definitions use `const` type parameters, which need TypeScript
// 5; this project builds with the TypeScript that ships with react-scripts 5.
// Vercel's cloud build has its own newer compiler, so zod parsed there but not
// under `vercel dev`. Raw JSON Schema keeps local and deployed builds identical
// and drops a dependency we never really needed.
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

You are given the list of places a user has photographed. Infer the *kind* of travel they enjoy -- terrain, climate, pace, and activity -- and suggest new destinations that fit.

Rules:
- "intro" names the pattern you noticed, in warm, conversational second person. One or two sentences. Examples of the register: "I see you're drawn to coastal cities" or "Looks like you chase a bit of adrenaline".
- Suggest 3 to 5 destinations the user has NOT already visited.
- Each "reason" is a single sentence tying the suggestion to something concrete in their history.
- Latitude and longitude must be the real coordinates of the place you name, since the app drops a map pin there.
- Prefer specific places -- a city, region, or national park -- over whole countries.
- If the history is thin or scattered with no clear pattern, say so honestly in the intro and suggest broadly appealing places rather than inventing a theme.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startedAt = Date.now();
  const { ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  // Checking the destructured consts (rather than a computed list) is what lets
  // TypeScript narrow them to string below.
  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Name the missing ones -- a guard that only says "not configured" gives
    // you nothing to act on. Names only, never values.
    const missing = (
      ['ANTHROPIC_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'] as const
    ).filter((name) => !process.env[name]);
    console.error('Missing required environment variables:', missing.join(', '));
    return res.status(500).json({ error: 'Server is not configured', missing });
  }

  // Identity comes from the caller's Supabase JWT, never from the request body.
  // Trusting a body-supplied user id would let anyone read anyone's history.
  const authHeader = req.headers.authorization ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  // Passing the token through to PostgREST means every query below runs as this
  // user under RLS, so the policies are the enforcement, not our own filtering.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  const user = userData.user;

  try {
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select('title, country, latitude, longitude, taken_date')
      .eq('user_id', user.id);

    if (photosError) throw photosError;

    const photoCount = photos?.length ?? 0;
    if (photoCount < MIN_PHOTOS) {
      return res.status(200).json({
        needsMorePhotos: true,
        photo_count: photoCount,
        required: MIN_PHOTOS,
      });
    }

    const refresh = req.body?.refresh === true;

    if (!refresh) {
      const { data: cached } = await supabase
        .from('recommendations')
        .select('intro, suggestions, photo_count, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cached) {
        logCall({
          endpoint: 'recommendations',
          model: MODEL,
          cacheHit: true,
          latencyMs: Date.now() - startedAt,
          outcome: 'ok',
          meta: { photoCount },
        });
        return res.status(200).json({ ...cached, cached: true });
      }
    }

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
      return res.status(200).json({
        needsMorePhotos: true,
        photo_count: photoCount,
        required: MIN_PHOTOS,
      });
    }

    const locationList = locations
      .map(
        (p) =>
          `- ${p.title}, ${p.country} (${Number(p.latitude).toFixed(2)}, ${Number(
            p.longitude
          ).toFixed(2)})${p.taken_date ? ` -- ${p.taken_date}` : ''}`
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
          content: `Here are the ${locations.length} places I've photographed:\n\n${locationList}\n\nWhere should I go next?`,
        },
      ],
    });

    // The schema constrains what the model writes, but the transport is still
    // a text block -- find it and parse.
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

    // Cheap shape check, since zod is no longer doing it for us.
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

    const { error: writeError } = await supabase.from('recommendations').upsert(
      {
        user_id: user.id,
        intro: result.intro,
        suggestions: result.suggestions,
        photo_count: photoCount,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    // A failed cache write shouldn't cost the user the result they just paid for.
    if (writeError) {
      console.error('Failed to cache recommendations:', writeError.message);
    }

    logCall({
      endpoint: 'recommendations',
      model: MODEL,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
      usage: message.usage,
      outcome: 'ok',
      meta: { photoCount, locations: locations.length, suggestions: result.suggestions.length },
    });

    return res.status(200).json({
      intro: result.intro,
      suggestions: result.suggestions,
      photo_count: photoCount,
      cached: false,
    });
  } catch (err) {
    console.error('Recommendation generation failed:', err);
    logCall({
      endpoint: 'recommendations',
      model: MODEL,
      cacheHit: false,
      latencyMs: Date.now() - startedAt,
      outcome: 'model_error',
    });
    return res.status(500).json({ error: 'Could not generate recommendations' });
  }
}
