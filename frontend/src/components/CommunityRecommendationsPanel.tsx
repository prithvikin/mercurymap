import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Sparkles, ArrowRight } from 'lucide-react';
import {
  communityRecommendationService,
  CommunityRecommendation,
} from '../services/communityRecommendationService.ts';

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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center mb-4">
        <Sparkles className="h-6 w-6 mr-2 text-blue-600" />
        Popular Next Destinations
      </h2>

      <p className="text-gray-700 mb-5">{data.intro}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => (
          <div
            key={`${suggestion.place}-${suggestion.country}`}
            className={`bg-gray-50 rounded-lg p-4 transition-colors ${
              onSelectPlace ? 'cursor-pointer hover:bg-gray-100' : ''
            }`}
            onClick={
              onSelectPlace
                ? () =>
                    onSelectPlace({
                      lat: suggestion.latitude,
                      lng: suggestion.longitude,
                      name: suggestion.place,
                    })
                : undefined
            }
          >
            <h3 className="font-semibold text-gray-900 mb-1">{suggestion.place}</h3>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              {suggestion.country}
            </div>
            <p className="text-sm text-gray-500">{suggestion.reason}</p>
          </div>
        ))}
      </div>

      {compact && (
        <div className="mt-5 text-center">
          <Link
            to="/public"
            className="inline-flex items-center space-x-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
          >
            <span>Explore on the map</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default CommunityRecommendationsPanel;
