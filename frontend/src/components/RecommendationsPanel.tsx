import React, { useState } from 'react';
import { MapPin, Sparkles, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  recommendationService,
  Recommendation,
} from '../services/recommendationService.ts';

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
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Sparkles className="h-6 w-6 mr-2 text-blue-600" />
          Where to next?
        </h2>
        {data && !data.needsMorePhotos && (
          <button
            onClick={() => fetchRecommendations(true)}
            disabled={loading}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {isStale && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4 text-sm">
          You've added photos since this was generated. Refresh for an updated
          suggestion.
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!loading && !data && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Based on the places you've photographed, get suggestions for where to
            travel next.
          </p>
          <button
            onClick={() => fetchRecommendations(false)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Suggest destinations
          </button>
        </div>
      )}

      {!loading && data?.needsMorePhotos && (
        <div className="text-center py-8">
          <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">
            Upload at least {data.required} photos with locations and we can start
            spotting what kind of travel you like.
          </p>
        </div>
      )}

      {!loading && data?.suggestions && (
        <>
          <p className="text-gray-700 mb-5">{data.intro}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.suggestions.map((suggestion) => (
              <div
                key={`${suggestion.place}-${suggestion.country}`}
                className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() =>
                  onSelectPlace({
                    lat: suggestion.latitude,
                    lng: suggestion.longitude,
                    name: suggestion.place,
                  })
                }
              >
                <h3 className="font-semibold text-gray-900 mb-1">
                  {suggestion.place}
                </h3>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <MapPin className="h-4 w-4 mr-1" />
                  {suggestion.country}
                </div>
                <p className="text-sm text-gray-500">{suggestion.reason}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendationsPanel;
