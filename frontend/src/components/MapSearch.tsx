import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, MapPin, AlertCircle } from 'lucide-react';
import Spinner from './ui/Spinner.tsx';
import { focusRing } from './ui/buttonStyles.ts';
import {
  geocoderErrorMessage,
  GEOCODER_NETWORK_ERROR,
} from '../lib/geocoderError.ts';

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
  placeholder = "Search for a city, country, or landmark…"
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const generatedId = useId();
  const inputId = `map-search-${generatedId}`;
  const listboxId = `${inputId}-listbox`;

  const searchLocations = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setError(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${process.env.REACT_APP_MAPBOX_TOKEN}&limit=5&types=place,country,region`
      );

      // A rejected token comes back as a normal response, not a thrown error,
      // so without this check the failure looks identical to "no matches".
      if (!response.ok) {
        console.error(
          `Mapbox geocoding failed: ${response.status} ${response.statusText}`
        );
        setSuggestions([]);
        setError(geocoderErrorMessage(response.status));
        return;
      }

      const data = await response.json();
      setSuggestions(data.features ?? []);
    } catch (error) {
      console.error('Error searching locations:', error);
      setSuggestions([]);
      setError(GEOCODER_NETWORK_ERROR);
    } finally {
      setLoading(false);
      setSearched(true);
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

  const expanded = showSuggestions && suggestions.length > 0;

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <label htmlFor={inputId} className="sr-only">
          Search the map for a place
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-sand-400" aria-hidden="true" />
        </div>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowSuggestions(false);
          }}
          className="block w-full pl-10 pr-10 py-2 border border-sand-300 rounded-lg leading-5 bg-white shadow-card placeholder-sand-500 focus:outline-none focus:placeholder-sand-400 focus:ring-2 focus:ring-clay-500 focus:border-clay-500"
          placeholder={placeholder}
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-clay-600">
            <Spinner label="Searching for places…" className="h-4 w-4" />
          </div>
        )}
      </div>

      <ul
        id={listboxId}
        role="listbox"
        aria-label="Place suggestions"
        hidden={!expanded}
        className="absolute z-10 w-full mt-1 bg-white border border-sand-200 rounded-xl shadow-float max-h-60 overflow-auto"
      >
        {suggestions.map((feature) => (
          <li key={feature.id} role="option" aria-selected={false}>
            <button
              type="button"
              onClick={() => handleSelect(feature)}
              className={`w-full text-left px-4 py-3 hover:bg-sand-50 border-b border-sand-100 last:border-b-0 ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0`}
            >
              <div className="flex items-start">
                <MapPin className="h-4 w-4 text-sand-400 mt-0.5 mr-2 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sand-900 truncate">
                    {feature.text}
                  </div>
                  <div className="text-sm text-sand-500 truncate">
                    {feature.place_name}
                  </div>
                  <div className="text-xs text-sand-400">
                    {getLocationType(feature)}
                  </div>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {showSuggestions && !loading && error && (
        <div
          role="status"
          className="absolute z-10 w-full mt-1 bg-white border border-berry-200 rounded-xl shadow-float px-3 py-2 flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 text-berry-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm text-berry-700">{error}</span>
        </div>
      )}

      {showSuggestions && !loading && !error && searched && suggestions.length === 0 && (
        <div
          role="status"
          className="absolute z-10 w-full mt-1 bg-white border border-sand-200 rounded-xl shadow-float px-3 py-2"
        >
          <span className="text-sm text-sand-500">No matching places found.</span>
        </div>
      )}
    </div>
  );
};

export default MapSearch;
