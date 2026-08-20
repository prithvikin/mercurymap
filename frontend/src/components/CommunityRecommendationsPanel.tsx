import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Sparkles, ArrowRight } from 'lucide-react';
import {
  communityRecommendationService,
  CommunityRecommendation,
} from '../services/communityRecommendationService.ts';
import Card from './ui/Card.tsx';

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
    <Card className="p-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-4">
        <h2 className="text-xl font-bold text-slate-900 flex items-center">
          <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
          Popular Next Destinations
        </h2>
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">
          AI-generated
        </span>
      </div>

      <p className="text-slate-700 mb-5">{data.intro}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suggestions.map((suggestion) => (
          <div
            key={`${suggestion.place}-${suggestion.country}`}
            className={`bg-slate-50 border border-slate-100 rounded-xl p-4 transition-colors ${
              onSelectPlace ? 'cursor-pointer hover:bg-slate-100' : ''
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
            <h3 className="font-semibold text-slate-900 mb-1">{suggestion.place}</h3>
            <div className="flex items-center text-sm text-slate-500 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              {suggestion.country}
            </div>
            <p className="text-sm text-slate-500">{suggestion.reason}</p>
          </div>
        ))}
      </div>

      {compact && (
        <div className="mt-5 text-center">
          <Link
            to="/public"
            className="inline-flex items-center space-x-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            <span>Explore on the map</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-start gap-1.5">
        <Sparkles className="h-3.5 w-3.5 mt-px flex-shrink-0" />
        <span>
          Created with AI based on the places MercuryMap's community has
          publicly photographed. Suggestions may not always be accurate.
        </span>
      </p>
    </Card>
  );
};

export default CommunityRecommendationsPanel;
