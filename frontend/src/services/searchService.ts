import { Photo } from '../lib/supabase.ts';

export interface SearchPhoto extends Photo {
  // ts_rank is returned by the semantic RPC. The degraded ILIKE fallback has
  // no meaningful rank, so it returns null instead of inventing one.
  rank?: number | null;
}

export interface SearchFilters {
  country: string | null;
  date_from: string | null;
  date_to: string | null;
}

export interface PhotoSearchResult {
  photos: SearchPhoto[];
  query: string;
  keywords: string[];
  filters: SearchFilters;
  degraded: boolean;
  note?: string;
}

export interface SimilarPhoto extends Photo {
  // Cosine similarity is normalized so 1 is identical and values closer to 0
  // are less alike. It comes from pgvector's (1 - cosine distance) expression.
  similarity: number;
}

export interface SimilarPhotosResult {
  photos: SimilarPhoto[];
  sourcePhotoId: string;
  degraded: boolean;
  note?: string;
}

export const searchService = {
  async search(query: string): Promise<PhotoSearchResult> {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      // Keep the API's actionable message. A generic "search failed" makes
      // missing environment variables and malformed queries unnecessarily hard
      // to diagnose in the UI.
      throw new Error(body.error || `Search failed (${response.status})`);
    }
    return response.json();
  },

  async findSimilar(photoId: string): Promise<SimilarPhotosResult> {
    const response = await fetch(`/api/similar?photoId=${encodeURIComponent(photoId)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Similar-photo search failed (${response.status})`);
    }
    return response.json();
  },
};
