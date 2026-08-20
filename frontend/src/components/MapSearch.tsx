import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin } from 'lucide-react';

interface MapboxFeature {
  id: string;
  type: string;
  place_type: string[];
  relevance: number;
  properties: {
    wikidata?: string;
    short_code?: string;
    foursquare?: string;
    landmark?: boolean;
    address?: string;
    category?: string;
    maki?: string;
  };
  text: string;
  place_name: string;
  bbox?: number[];
  center: [number, number];
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    short_code?: string;
    wikidata?: string;
    text: string;
  }>;
}

interface MapSearchProps {
  onLocationSelect: (location: { 
    lat: number; 
    lng: number; 
    name: string;
    bbox?: number[];
  }) => void;
  placeholder?: string;
}

const MapSearch: React.FC<MapSearchProps> = ({ 
  onLocationSelect, 
  placeholder = "Search for a city, country, or landmark..." 
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}&limit=5&types=place,country,region`
      );
      const data = await response.json();
      
      if (data.features) {
        setSuggestions(data.features);
      }
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce the search
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      searchLocations(query);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query]);

  const handleSelect = (feature: MapboxFeature) => {
    const [lng, lat] = feature.center;
    onLocationSelect({
      lat,
      lng,
      name: feature.place_name,
      bbox: feature.bbox
    });
    
    setQuery(feature.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getLocationType = (feature: MapboxFeature) => {
    if (feature.place_type.includes('country')) return 'Country';
    if (feature.place_type.includes('region')) return 'Region';
    if (feature.place_type.includes('place')) return 'City';
    return 'Location';
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white shadow-card placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={placeholder}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
          {suggestions.map((feature) => (
            <button
              key={feature.id}
              onClick={() => handleSelect(feature)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none border-b border-slate-100 last:border-b-0"
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-slate-400 mt-0.5 mr-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {feature.text}
                  </div>
                  <div className="text-sm text-slate-500 truncate">
                    {feature.place_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {getLocationType(feature)}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapSearch; 