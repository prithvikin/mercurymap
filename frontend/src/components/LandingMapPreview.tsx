import React, { useEffect, useRef, useState } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { photoService } from '../services/photoService.ts';
import { Photo } from '../lib/supabase.ts';
import PhotoImage from './PhotoImage.tsx';
import { button } from './ui/buttonStyles.ts';

// Loaded lazily from Landing.tsx (React.lazy) so Mapbox GL doesn't sit in the
// very first bundle a visitor downloads -- this preview is a nice-to-have,
// not the page shell.

const PAN_INTERVAL_MS = 4500;
const FLY_DURATION_MS = 1800;
// The first flight is deliberately quicker than the rest. Every later pan is
// something the visitor is already watching, so it can take its time; the
// opening one is dead air on a page that has otherwise finished painting, and
// 1800ms of it plus the reveal delay meant nearly two seconds of an empty
// world map before anything moved.
const FIRST_FLY_DURATION_MS = 700;
// Reveal the photo card once the camera has essentially arrived, not while
// it's still mid-flight -- this is what makes it read as "the pin was
// clicked" rather than "a card is dragging across the map."
const PHOTO_REVEAL_GAP_MS = 100;
const MAX_LOCATIONS = 8;
const INITIAL_VIEW_STATE = { longitude: 0, latitude: 20, zoom: 1.25 };
// Matches PhotoPopupCard's own w-40 (10rem). index.css used to carry a
// `.mapboxgl-popup-content { min-width: 280px; max-width: 450px; }` rule
// from a since-removed popup feature -- it was dead (this component is the
// only Popup user in the codebase) but still applied globally, and
// min-width always wins over width regardless of !important, so it forced
// every popup wider than this card until that rule was deleted. Passing
// maxWidth here is a lightweight belt-and-suspenders cap now that nothing
// is fighting it.
const POPUP_WIDTH_PX = 160;

interface Location {
  key: string;
  latitude: number;
  longitude: number;
  photo: Photo;
}

// Rounded to 2 decimal places (~1km) rather than the exact photo coordinate --
// several photos in the same city would otherwise fly the camera to nearly
// identical points back to back, which reads as a stutter, not a pan.
function uniqueLocations(photos: Photo[]): Location[] {
  // globalThis.Map, not Map -- the default import above shadows the native
  // collection with the react-map-gl component of the same name.
  const seen = new globalThis.Map<string, Location>();
  for (const photo of photos) {
    if (photo.latitude == null || photo.longitude == null) continue;
    const key = `${photo.latitude.toFixed(2)}_${photo.longitude.toFixed(2)}`;
    if (!seen.has(key)) {
      seen.set(key, { key, latitude: photo.latitude, longitude: photo.longitude, photo });
    }
  }
  return Array.from(seen.values()).slice(0, MAX_LOCATIONS);
}

// The card's own mount-triggered transition. A fresh instance mounts every
// time the active location changes (React keys it by location.key), so this
// only needs an enter animation -- there is no exit to animate.
const PhotoPopupCard: React.FC<{ photo: Photo }> = ({ photo }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`w-40 overflow-hidden rounded-xl bg-white shadow-float ring-1 ring-sand-900/5 transition-all duration-300 ease-out ${
        visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
      }`}
    >
      <PhotoImage
        src={photo.file_url}
        alt={photo.title || 'Travel photo'}
        width={200}
        className="h-24 w-full bg-sand-200 object-cover"
      />
      <div className="p-2">
        <p className="truncate text-xs font-semibold text-sand-900">{photo.title || 'Untitled'}</p>
        <p className="truncate text-[11px] text-sand-500">{photo.country}</p>
      </div>
    </div>
  );
};

const LandingMapPreview: React.FC = () => {
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  // The <Map> only mounts once `locations` resolves, so the pan effect below
  // would otherwise fire on the very same commit that creates the map -- with
  // the Mapbox instance either still null or not yet through its `load`
  // event. `mapRef.current?.flyTo(...)` swallows that silently, so the opening
  // flight went nowhere and the first visible movement was the interval's
  // first tick a full PAN_INTERVAL_MS later. Waiting for `load` is what makes
  // "start immediately" actually mean immediately.
  const [mapReady, setMapReady] = useState(false);
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
    if (!locations || locations.length === 0 || !mapReady) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || locations.length === 1) {
      const first = locations[0];
      mapRef.current?.jumpTo({ center: [first.longitude, first.latitude], zoom: 3 });
      setActiveLocation(first);
      return;
    }

    let revealTimeout: number;

    const flyToNext = (durationMs: number) => {
      const next = locations[panIndexRef.current % locations.length];
      panIndexRef.current += 1;
      // Hide the current card immediately -- it belongs to the pin the
      // camera is leaving, not the one it's flying toward.
      setActiveLocation(null);
      mapRef.current?.flyTo({ center: [next.longitude, next.latitude], zoom: 3.4, duration: durationMs });
      window.clearTimeout(revealTimeout);
      // Reveal tracks whichever flight this was, so the card still lands as
      // the camera arrives rather than at a fixed offset that only matched
      // the slow pan.
      revealTimeout = window.setTimeout(() => setActiveLocation(next), durationMs + PHOTO_REVEAL_GAP_MS);
    };

    flyToNext(FIRST_FLY_DURATION_MS);
    const interval = window.setInterval(() => flyToNext(FLY_DURATION_MS), PAN_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(revealTimeout);
    };
  }, [locations, mapReady]);

  const isLoading = locations === null;
  const hasLocations = locations !== null && locations.length > 0;

  return (
    <div className="relative h-96 overflow-hidden rounded-3xl border border-sand-200 shadow-card sm:h-[32rem] lg:h-[38rem]">
      {isLoading ? (
        <div className="h-full w-full animate-pulse bg-gradient-to-br from-sand-100 to-sand-200" />
      ) : hasLocations ? (
        // Decorative: the map is a preview, not a tool. All the real
        // interaction lives behind the CTA below, which stays outside this
        // aria-hidden region so it's fully reachable by keyboard and screen
        // readers. Gesture handlers are off so scrolling the page never gets
        // trapped as a zoom on a map the visitor didn't ask to touch.
        <div aria-hidden="true" className="h-full w-full">
          <Map
            ref={mapRef}
            onLoad={() => setMapReady(true)}
            initialViewState={INITIAL_VIEW_STATE}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/outdoors-v12"
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
                <span className="block h-3.5 w-3.5 rounded-full border-2 border-white bg-clay-600 shadow-card" />
              </Marker>
            ))}

            {activeLocation && (
              // Keyed so each location gets a fresh card instance -- that's
              // what re-triggers PhotoPopupCard's enter transition on every
              // stop, rather than one instance whose photo prop just changes.
              <Popup
                key={activeLocation.key}
                longitude={activeLocation.longitude}
                latitude={activeLocation.latitude}
                anchor="bottom"
                offset={16}
                maxWidth={`${POPUP_WIDTH_PX}px`}
                closeButton={false}
                closeOnClick={false}
                focusAfterOpen={false}
                className="[&_.mapboxgl-popup-content]:rounded-xl [&_.mapboxgl-popup-content]:p-0 [&_.mapboxgl-popup-content]:shadow-none [&_.mapboxgl-popup-tip]:border-t-white"
              >
                <PhotoPopupCard photo={activeLocation.photo} />
              </Popup>
            )}
          </Map>
        </div>
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-clay-50 to-white" />
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
