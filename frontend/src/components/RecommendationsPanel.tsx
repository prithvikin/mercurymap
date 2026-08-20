import React, { useState } from 'react';
import { MapPin, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  recommendationService,
  Recommendation,
} from '../services/recommendationService.ts';
import Card from './ui/Card.tsx';
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
      setError(message);
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
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
            Where to next?
          </h2>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-100">
            AI-generated
          </span>
        </div>
        {data && !data.needsMorePhotos && (
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className={button('ghost', 'sm')}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {isStale && (
        <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 px-4 py-3 rounded-xl mb-4 text-sm">
          You've added photos since this was generated. Refresh for an updated
          suggestion.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-8">
          <p className="text-slate-600 mb-4">
            Based on the places you've photographed, get suggestions for where to
            travel next.
          </p>
          <button
            onClick={() => fetchRecommendations(false)}
            className={button('primary', 'md')}
          >
            Suggest destinations
          </button>
        </div>
      )}

      {!loading && data?.needsMorePhotos && (
        <div className="text-center py-8">
          <MapPin className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600">
            Upload at least {data.required} photos with locations and we can start
            spotting what kind of travel you like.
          </p>
        </div>
      )}

      {!loading && data?.suggestions && (
        <>
          <p className="text-slate-700 mb-5">{data.intro}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.suggestions.map((suggestion) => (
              <div
                key={`${suggestion.place}-${suggestion.country}`}
                className="bg-slate-50 border border-slate-100 rounded-xl p-4 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() =>
                  onSelectPlace({
                    lat: suggestion.latitude,
                    lng: suggestion.longitude,
                    name: suggestion.place,
                  })
                }
              >
                <h3 className="font-semibold text-slate-900 mb-1">
                  {suggestion.place}
                </h3>
                <div className="flex items-center text-sm text-slate-500 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {suggestion.country}
                </div>
                <p className="text-sm text-slate-500">{suggestion.reason}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-start gap-1.5">
            <Sparkles className="h-3.5 w-3.5 mt-px flex-shrink-0" />
            <span>
              Created with AI based on the places you've photographed.
              Suggestions may not always be accurate.
            </span>
          </p>
        </>
      )}
    </Card>
  );
};

export default RecommendationsPanel;
