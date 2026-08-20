import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  geocoderErrorMessage,
  GEOCODER_NETWORK_ERROR,
} from '../lib/geocoderError.ts';

interface Location {
  formatted: string;
  geometry: {
    lat: number;
    lng: number;
  };
  components: {
    city?: string;
    country?: string;
  };
}

interface LocationSearchProps {
  onLocationSelect: (location: { lat: number; lng: number; city: string; country: string }) => void;
  placeholder?: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({ onLocationSelect, placeholder = "Search for a city or country..." }) => {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setError(null);
      setSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Using OpenCage Geocoding API
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&limit=5&key=${process.env.REACT_APP_OPENCAGE_API_KEY}`
      );

      // A rejected key comes back as a normal response, not a thrown error, so
      // without this check the failure looks identical to "no matches".
      if (!response.ok) {
        console.error(
          `OpenCage geocoding failed: ${response.status} ${response.statusText}`
        );
        setSuggestions([]);
        setError(geocoderErrorMessage(response.status));
        return;
      }

      const data = await response.json();
      setSuggestions(data.results ?? []);
    } catch (error) {
      console.error('Error fetching locations:', error);
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
      searchLocations(value);
    }, 300);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value]);

  const handleSelect = (location: Location) => {
    const city = location.components.city || location.formatted.split(',')[0];
    const country = location.components.country || location.formatted.split(',').pop()?.trim();
    
    onLocationSelect({
      lat: location.geometry.lat,
      lng: location.geometry.lng,
      city: city || '',
      country: country || ''
    });
    
    setValue(location.formatted);
    setSuggestions([]);
  };

  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setHighlightedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleSuggestionClick = (location: Location) => {
    handleSelect(location);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setHighlightedIndex(-1);
          }
        }}
        onBlur={() => {
          // Delay hiding suggestions to allow for clicks
          setTimeout(() => {
            setSuggestions([]);
            setError(null);
            setSearched(false);
            setHighlightedIndex(-1);
          }, 200);
        }}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        placeholder={placeholder}
      />

      {suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-auto">
          {suggestions.map((item, index) => (
            <div
              key={item.formatted}
              className={`p-2 cursor-pointer ${
                index === highlightedIndex ? 'bg-indigo-50' : 'bg-white'
              } hover:bg-slate-50 border-b border-slate-100 last:border-b-0`}
              onClick={() => handleSuggestionClick(item)}
            >
              <div className="font-medium text-slate-900">{item.formatted}</div>
              <div className="text-sm text-slate-500">
                {item.components.city && item.components.country
                  ? `${item.components.city}, ${item.components.country}`
                  : item.formatted
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div
          role="status"
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-red-200 rounded-xl shadow-lg px-3 py-2 flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {!loading && !error && searched && suggestions.length === 0 && (
        <div
          role="status"
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2"
        >
          <span className="text-sm text-slate-500">No matching places found.</span>
        </div>
      )}

      {loading && (
        <div className="absolute right-3 top-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch; 