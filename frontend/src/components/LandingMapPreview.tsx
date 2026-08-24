import React, { useEffect, useRef, useState } from 'react';
import Map, { Marker } from 'react-map-gl';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { photoService } from '../services/photoService.ts';
import { Photo } from '../lib/supabase.ts';
import { button } from './ui/buttonStyles.ts';

// Loaded lazily from Landing.tsx (React.lazy) so Mapbox GL doesn't sit in the
// very first bundle a visitor downloads -- this preview is a nice-to-have,
// not the page shell.

const PAN_INTERVAL_MS = 4500;
const MAX_LOCATIONS = 8;
const INITIAL_VIEW_STATE = { longitude: 0, latitude: 20, zoom: 1.25 };

interface Location {
  key: string;
  latitude: number;
  longitude: number;
}

// Rounded to 2 decimal places (~1km) rather than the exact photo coordinate --
// several photos in the same city would otherwise fly the camera to nearly
// identical points back to back, which reads as a stutter, not a pan.
function uniqueLocations(photos: Photo[]): Location[] {
  const seen = new Map<string, Location>();
  for (const photo of photos) {
    if (photo.latitude == null || photo.longitude == null) continue;
    const key = `${photo.latitude.toFixed(2)}_${photo.longitude.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.set(key, { key, latitude: photo.latitude, longitude: photo.longitude });
    }
  }
  return Array.from(seen.values()).slice(0, MAX_LOCATIONS);
}

const LandingMapPreview: React.FC = () => {
  const [locations, setLocations] = useState<Location[] | null>(null);
  const mapRef = useRef<any>(null);
  const panIndexRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    photoService
      .getAllPhotos()
      .then((photos) => {
        if (!cancelled) setLocations(uniqueLocations(photos));
      })
      .catch((error) => {
        // A broken preview shouldn't block the page -- fall back to the
        // static gradient panel below and let the real /public page surface
        // the actual error. Logged rather than swallowed: this is the one
        // signal that would show whether the fetch itself failed versus
        // something downstream, and there is no other surface for it.
        console.error('Landing map preview: failed to load public photos', error);
        if (!cancelled) setLocations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!locations || locations.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || locations.length === 1) {
      const first = locations[0];
      mapRef.current?.jumpTo({ center: [first.longitude, first.latitude], zoom: 3 });
      return;
    }

    const flyToNext = () => {
      const next = locations[panIndexRef.current % locations.length];
      panIndexRef.current += 1;
      mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 3.4, duration: 1800 });
    };

    flyToNext();
    const interval = window.setInterval(flyToNext, PAN_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [locations]);

  const isLoading = locations === null;
  const hasLocations = locations !== null && locations.length > 0;

  return (
    <div className="relative h-72 overflow-hidden rounded-3xl border border-slate-200 shadow-card sm:h-96">
      {isLoading ? (
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-slate-100 to-slate-200" />
      ) : hasLocations ? (
        // Decorative: the map is a preview, not a tool. All the real
        // interaction lives behind the CTA below, which stays outside this
        // aria-hidden region so it's fully reachable by keyboard and screen
        // readers. Gesture handlers are off so scrolling the page never gets
        // trapped as a zoom on a map the visitor didn't ask to touch.
        <div aria-hidden="true" className="h-full w-full">
          <Map
            ref={mapRef}
            initialViewState={INITIAL_VIEW_STATE}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v11"
            mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
            dragPan={false}
            dragRotate={false}
            scrollZoom={false}
            boxZoom={false}
            doubleClickZoom={false}
            touchZoomRotate={false}
            touchPitch={false}
            keyboard={false}
          >
            {locations.map((location) => (
              <Marker key={location.key} longitude={location.longitude} latitude={location.latitude} anchor="bottom">
                <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-600 shadow-card" />
              </Marker>
            ))}
          </Map>
        </div>
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-indigo-50 to-white" />
      )}

      <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/50 via-black/5 to-transparent p-6 sm:p-8">
        <Link to="/public" className={`pointer-events-auto ${button('primary', 'lg')}`}>
          <span>Explore the Public Map</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default LandingMapPreview;
