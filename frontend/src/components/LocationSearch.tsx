import React, { useState, useEffect, useRef } from 'react';
import Autocomplete from 'react-autocomplete';

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
  const timeoutRef = useRef<NodeJS.Timeout>();

  const searchLocations = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Using OpenCage Geocoding API
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(query)}&limit=5&key=${process.env.REACT_APP_OPENCAGE_API_KEY}`
      );
      const data = await response.json();
      
      if (data.results) {
        setSuggestions(data.results);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
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

  return (
    <div className="relative">
      <Autocomplete
        value={value}
        items={suggestions}
        getItemValue={(item) => item.formatted}
        onChange={(e) => setValue(e.target.value)}
        onSelect={(val, item) => handleSelect(item)}
        renderItem={(item, isHighlighted) => (
          <div
            key={item.formatted}
            className={`p-2 cursor-pointer ${
              isHighlighted ? 'bg-blue-100' : 'bg-white'
            } hover:bg-gray-50 border-b border-gray-200`}
          >
            <div className="font-medium">{item.formatted}</div>
            <div className="text-sm text-gray-500">
              {item.components.city && item.components.country 
                ? `${item.components.city}, ${item.components.country}`
                : item.formatted
              }
            </div>
          </div>
        )}
        renderInput={(props) => (
          <input
            {...props}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={placeholder}
          />
        )}
        wrapperStyle={{
          display: 'block',
          position: 'relative'
        }}
        menuStyle={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          maxHeight: '200px',
          overflow: 'auto'
        }}
      />
      {loading && (
        <div className="absolute right-3 top-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  );
};

export default LocationSearch; 