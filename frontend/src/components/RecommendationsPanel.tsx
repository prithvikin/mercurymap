import React, { useState } from 'react';
import { MapPin, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  recommendationService,
  Recommendation,
} from '../services/recommendationService.ts';
import Card from './ui/Card.tsx';
import Spinner from './ui/Spinner.tsx';
import SuggestionCard from './ui/SuggestionCard.tsx';
import AiDisclaimer from './ui/AiDisclaimer.tsx';
import { button } from './ui/buttonStyles.ts';

interface RecommendationsPanelProps {
  photoCount: number;
  onSelectPlace: (location: { lat: number; lng: number; name: string }) => void;
}

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  photoCount,
  onSelectPlace,
}) => {
  const [data, setData] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendationService.getRecommendations(refresh);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`${message} Try again in a moment.`);
      toast.error('Could not load recommendations');
    } finally {
      setLoading(false);
    }
  };

  // The cached result was generated against a photo count; if the user has
  // uploaded since, the recommendation is out of date.
  const isStale =
    data != null &&
    data.photo_count != null &&
    photoCount > data.photo_count &&
    !data.needsMorePhotos;

  return (
    <Card className="p-6" aria-labelledby="recommendations-heading">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2
            id="recommendations-heading"
            className="font-display text-xl font-bold text-sand-900 flex items-center"
          >
            <Sparkles className="h-5 w-5 mr-2 text-sea-600" aria-hidden="true" />
            Where to Next?
          </h2>
          <span className="inline-flex items-center rounded-full bg-sea-50 px-2.5 py-0.5 text-xs font-semibold text-sea-700 ring-1 ring-inset ring-sea-100">
            AI-generated
          </span>
        </div>
        {data && !data.needsMorePhotos && (
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className={button('ghost', 'sm')}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-berry-50 border border-berry-200 text-berry-700 px-4 py-3 rounded-xl mb-4 text-sm"
        >
          {error}
        </div>
      )}

      {isStale && (
        <div
          role="status"
          className="bg-sea-50 border border-sea-100 text-sea-800 px-4 py-3 rounded-xl mb-4 text-sm"
        >
          You’ve added photos since this was generated. Refresh for an updated suggestion.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12 text-sea-600">
          <Spinner label="Finding destinations for you…" className="h-12 w-12" />
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-8">
          <p className="text-sand-600 mb-4 text-pretty">
            Based on the places you’ve photographed, get suggestions for where to travel next.
          </p>
          <button
            onClick={() => fetchRecommendations(false)}
            className={button('primary', 'md')}
          >
            Suggest Destinations
          </button>
        </div>
      )}

      {!loading && data?.needsMorePhotos && (
        <div className="text-center py-8">
          <MapPin className="h-10 w-10 mx-auto text-sand-300 mb-3" aria-hidden="true" />
          <p className="text-sand-600 text-pretty">
            Upload at least {data.required} photos with locations and we can start spotting what
            kind of travel you like.
          </p>
        </div>
      )}

      {!loading && data?.suggestions && (
        <>
          <p className="text-sand-700 mb-5 text-pretty">{data.intro}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.suggestions.map((suggestion) => (
              <SuggestionCard
                key={`${suggestion.place}-${suggestion.country}`}
                place={suggestion.place}
                country={suggestion.country}
                reason={suggestion.reason}
                onSelect={() =>
                  onSelectPlace({
                    lat: suggestion.latitude,
                    lng: suggestion.longitude,
                    name: suggestion.place,
                  })
                }
              />
            ))}
          </div>
          <AiDisclaimer>
            Created with AI based on the places you’ve photographed. Suggestions may not always be
            accurate.
          </AiDisclaimer>
        </>
      )}
    </Card>
  );
};

export default RecommendationsPanel;
