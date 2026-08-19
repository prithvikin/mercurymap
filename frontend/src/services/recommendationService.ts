import { supabase } from '../lib/supabase.ts';

export interface Suggestion {
  place: string;
  country: string;
  latitude: number;
  longitude: number;
  reason: string;
}

export interface Recommendation {
  intro?: string;
  suggestions?: Suggestion[];
  photo_count: number;
  cached?: boolean;
  created_at?: string;
  // Set when the user hasn't uploaded enough photos to infer anything yet.
  needsMorePhotos?: boolean;
  required?: number;
}

export const recommendationService = {
  async getRecommendations(refresh = false): Promise<Recommendation> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be signed in to get recommendations');
    }

    const response = await fetch('/api/recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ refresh }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    return response.json();
  },
};
