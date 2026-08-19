export interface CommunitySuggestion {
  place: string;
  country: string;
  latitude: number;
  longitude: number;
  reason: string;
}

export interface CommunityRecommendation {
  intro?: string;
  suggestions?: CommunitySuggestion[];
  source_photo_count?: number;
  cached?: boolean;
  created_at?: string;
  // Set when the community hasn't shared enough public photos to infer anything yet.
  needsMoreData?: boolean;
}

export const communityRecommendationService = {
  async getCommunityRecommendations(): Promise<CommunityRecommendation> {
    const response = await fetch('/api/community-recommendations');

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || `Request failed (${response.status})`);
    }

    return response.json();
  },
};
