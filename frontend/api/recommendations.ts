import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Below this, there isn't enough signal to infer a taste — and we don't want to
// spend an API call to tell someone we don't know them yet.
const MIN_PHOTOS = 3;

// Cap on how many places we describe to the model, so prompt size stays bounded
// no matter how many photos a user uploads.
const MAX_LOCATIONS = 50;

const RecommendationSchema = z.object({
  intro: z.string(),
  suggestions: z
    .array(
      z.object({
        place: z.string(),
        country: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        reason: z.string(),
      })
    )
    .min(3)
    .max(5),
});

const SYSTEM_PROMPT = `You are the travel recommendation engine for MercuryMap, a photo-mapping app.

You are given the list of places a user has photographed. Infer the *kind* of travel they enjoy — terrain, climate, pace, and activity — and suggest new destinations that fit.

Rules:
- "intro" names the pattern you noticed, in warm, conversational second person. One or two sentences. Examples of the register: "I see you're drawn to coastal cities" or "Looks like you chase a bit of adrenaline".
- Suggest 3 to 5 destinations the user has NOT already visited.
- Each "reason" is a single sentence tying the suggestion to something concrete in their history.
- Latitude and longitude must be the real coordinates of the place you name, since the app drops a map pin there.
- Prefer specific places — a city, region, or national park — over whole countries.
- If the history is thin or scattered with no clear pattern, say so honestly in the intro and suggest broadly appealing places rather than inventing a theme.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing required environment variables');
    return res.status(500).json({ error: 'Server is not configured' });
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
          ).toFixed(2)})${p.taken_date ? ` — ${p.taken_date}` : ''}`
      )
      .join('\n');

    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const message = await anthropic.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'low',
        format: zodOutputFormat(RecommendationSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are the ${locations.length} places I've photographed:\n\n${locationList}\n\nWhere should I go next?`,
        },
      ],
    });

    const result = message.parsed_output;
    if (!result) {
      console.error('Model returned no parsable output', message.stop_reason);
      return res
        .status(502)
        .json({ error: 'Could not generate recommendations, please try again' });
    }

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

    return res.status(200).json({
      intro: result.intro,
      suggestions: result.suggestions,
      photo_count: photoCount,
      cached: false,
    });
  } catch (err) {
    console.error('Recommendation generation failed:', err);
    return res.status(500).json({ error: 'Could not generate recommendations' });
  }
}
