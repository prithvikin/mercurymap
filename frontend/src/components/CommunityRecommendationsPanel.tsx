import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import {
  communityRecommendationService,
  CommunityRecommendation,
} from '../services/communityRecommendationService.ts';
import Card from './ui/Card.tsx';
import SuggestionCard from './ui/SuggestionCard.tsx';
import AiDisclaimer from './ui/AiDisclaimer.tsx';
import { focusRing } from './ui/buttonStyles.ts';

interface CommunityRecommendationsPanelProps {
  // Compact mode is for the Landing page teaser: fewer cards, no map to pan,
  // just a CTA into the full public map.
  compact?: boolean;
  onSelectPlace?: (location: { lat: number; lng: number; name: string }) => void;
}

const CommunityRecommendationsPanel: React.FC<CommunityRecommendationsPanelProps> = ({
  compact = false,
  onSelectPlace,
}) => {
  const [data, setData] = useState<CommunityRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    communityRecommendationService
      .getCommunityRecommendations()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading and "nothing to show" states render nothing rather than an
  // error -- this is a teaser, not a feature the visitor asked for.
  if (loading || error || data?.needsMoreData || !data?.suggestions) {
    return null;
  }

  const suggestions = compact ? data.suggestions.slice(0, 3) : data.suggestions;

  return (
    <Card className="p-6" aria-labelledby="community-recommendations-heading">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        <h2
          id="community-recommendations-heading"
          className="font-display text-xl font-bold text-sand-900 flex items-center"
        >
          <Sparkles className="h-5 w-5 mr-2 text-sea-600" aria-hidden="true" />
          Popular Next Destinations
        </h2>
        <span className="inline-flex items-center rounded-full bg-sea-50 px-2.5 py-0.5 text-xs font-semibold text-sea-700 ring-1 ring-inset ring-sea-100">
          AI-generated
        </span>
      </div>

      <p className="text-sand-700 mb-5 text-pretty">{data.intro}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => (
          <SuggestionCard
            key={`${suggestion.place}-${suggestion.country}`}
            place={suggestion.place}
            country={suggestion.country}
            reason={suggestion.reason}
            onSelect={
              onSelectPlace
                ? () =>
                    onSelectPlace({
                      lat: suggestion.latitude,
                      lng: suggestion.longitude,
                      name: suggestion.place,
                    })
                : undefined
            }
          />
        ))}
      </div>

      {compact && (
        <div className="mt-5 text-center">
          <Link
            to="/public"
            className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-clay-600 font-semibold hover:text-clay-700 hover:underline transition-colors ${focusRing}`}
          >
            <span>Explore on the Map</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      <AiDisclaimer>
        Created with AI based on the places <span translate="no">MercuryMap</span>’s community has
        publicly photographed. Suggestions may not always be accurate.
      </AiDisclaimer>
    </Card>
  );
};

export default CommunityRecommendationsPanel;
