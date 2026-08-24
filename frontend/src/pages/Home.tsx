import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker } from 'react-map-gl';
import { photoService } from '../services/photoService.ts';
import { Photo } from '../lib/supabase.ts';
import { Camera, MapPin, Upload, LogIn, RotateCcw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useSearchParams } from 'react-router-dom';
import MapSearch from '../components/MapSearch.tsx';
import RecommendationsPanel from '../components/RecommendationsPanel.tsx';
import CommunityRecommendationsPanel from '../components/CommunityRecommendationsPanel.tsx';
import PhotoSearch from '../components/PhotoSearch.tsx';
import NavBar from '../components/NavBar.tsx';
import PhotoImage from '../components/PhotoImage.tsx';
import Card from '../components/ui/Card.tsx';
import Spinner from '../components/ui/Spinner.tsx';
import { button, focusRing } from '../components/ui/buttonStyles.ts';
import { photoDate } from '../lib/photoDate.ts';
import { useAuth } from '../contexts/AuthContext.tsx';

interface HomeProps {
  showPublicMap?: boolean;
}

const PREVIEW_COUNT = 6;

const Home: React.FC<HomeProps> = ({ showPublicMap }) => {
  const { user, loading: authLoading } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Photo[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const mapRef = useRef<any>(null);
  // The element that opened the modal, so focus can go back where it started.
  const modalOpenerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // "Show all" survives a reload and can be linked to, so it lives in the URL
  // rather than in component state.
  const [searchParams, setSearchParams] = useSearchParams();
  const showAllPhotos = searchParams.get('all') === '1';

  const toggleShowAll = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (showAllPhotos) {
          next.delete('all');
        } else {
          next.set('all', '1');
        }
        return next;
      },
      { replace: true }
    );
  };

  // Initial map state for reset functionality
  const initialViewState = {
    longitude: 0,
    latitude: 20,
    zoom: 1.25
  };

  // Mapbox viewport state
  const [viewState, setViewState] = useState(initialViewState);

  const handleResetMap = () => {
    setViewState(initialViewState);
    toast.success('Map reset to world view');
  };

  const handleLocationSearch = (location: {
    lat: number;
    lng: number;
    name: string;
    bbox?: number[];
  }) => {
    if (location.bbox && mapRef.current) {
      // Use bounding box to fit the entire area
      const [minLng, minLat, maxLng, maxLat] = location.bbox;
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat]
        ],
        {
          padding: 50,
          duration: 1000
        }
      );
    } else {
      // Fallback to center point with zoom
      setViewState({
        longitude: location.lng,
        latitude: location.lat,
        zoom: 8
      });
    }

    toast.success(`Zoomed to ${location.name}`);
  };

  const fetchPhotos = useCallback(async () => {
    try {
      let data;
      if (user && !showPublicMap) {
        // Fetch user's private photos
        data = await photoService.getUserPhotos(user.id);
      } else {
        // Fetch public photos
        data = await photoService.getAllPhotos();
      }
      setPhotos(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? `${error.message} Reload the page to try again.`
          : 'We could not load photos. Reload the page to try again.'
      );
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [user, showPublicMap]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Group photos by location (same lat/lng)
  const groupedPhotos = photos.reduce((groups, photo) => {
    const key = `${photo.latitude?.toFixed(4)}_${photo.longitude?.toFixed(4)}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(photo);
    return groups;
  }, {} as Record<string, Photo[]>);

  const handleMarkerClick = (photos: Photo[]) => {
    setSelectedLocation(photos);
  };

  const openModal = (index: number, opener: HTMLElement | null) => {
    modalOpenerRef.current = opener;
    setCurrentPhotoIndex(index);
    setModalOpen(true);
  };

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setCurrentPhotoIndex(0);
    modalOpenerRef.current?.focus();
    modalOpenerRef.current = null;
  }, []);

  const handleNextPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) =>
      selectedLocation && prev === selectedLocation.length - 1 ? 0 : prev + 1
    );
  }, [selectedLocation]);

  const handlePrevPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) =>
      prev === 0 && selectedLocation ? selectedLocation.length - 1 : prev - 1
    );
  }, [selectedLocation]);

  // Escape to close and arrow keys to page through, matching the on-screen
  // controls. Tab is trapped inside the dialog, and background scroll is locked
  // -- the modal covers the viewport, so scrolling underneath just loses your
  // place.
  useEffect(() => {
    if (!modalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>('button');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen, handleModalClose, handleNextPhoto, handlePrevPhoto]);

  const handleRecentPhotoClick = (photo: Photo, opener: HTMLElement | null) => {
    // Find if this photo is already in a group, or create a single photo group
    const photoGroup = [photo];
    setSelectedLocation(photoGroup);
    openModal(0, opener);
  };

  // A search hit can be anywhere in the world, so recentre the map as well as
  // opening the photo -- otherwise closing the modal leaves the visitor looking
  // at a viewport that never moved. Coordinates are nullable, so a photo
  // without them still opens; it just doesn't move the map.
  const handleSearchPhotoSelect = (photo: Photo, opener: HTMLElement | null) => {
    if (photo.latitude != null && photo.longitude != null) {
      handleLocationSearch({
        lat: photo.latitude,
        lng: photo.longitude,
        name: photo.title || photo.country,
      });
    }
    handleRecentPhotoClick(photo, opener);
  };

  const heading = showPublicMap || !user ? 'Public MercuryMap' : 'Your Private MercuryMap';
  const blurb =
    showPublicMap || !user
      ? 'Click on the map markers to view public photos taken in different countries. Sign in to view your private map.'
      : 'View your private travel photos on the map. Your photos are only visible to you.';

  const visiblePhotos = showAllPhotos ? photos : photos.slice(0, PREVIEW_COUNT);

  return (
    <div className="min-h-screen bg-sand-50">
      <NavBar />

      <main id="main-content">
        {loading ? (
          <div className="flex items-center justify-center h-96 text-clay-600">
            <Spinner label="Loading photos…" className="h-12 w-12" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="text-center">
              <h1 className="font-display text-3xl font-bold text-sand-900 mb-3 text-balance">
                <span translate="no">{heading}</span>
              </h1>
              <p className="text-sand-600 max-w-2xl mx-auto text-pretty">{blurb}</p>
              {!user && !showPublicMap && (
                <div className="mt-4">
                  <Link to="/login" className={button('primary', 'md')}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    <span>Sign In to View Your Private Map</span>
                  </Link>
                </div>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="bg-berry-50 border border-berry-200 text-berry-700 px-4 py-3 rounded-xl text-sm"
              >
                <strong>Error:</strong> {error}
              </div>
            )}

            <Card className="overflow-hidden">
              {/* Stacks on phones -- a 25% sidebar next to a map is unreadable
                  below ~640px, and a hardcoded 600px was taller than a small
                  viewport. */}
              <div className="flex flex-col sm:flex-row h-[80vh] max-h-[600px] min-h-[420px]">
                <div
                  className={`${
                    selectedLocation ? 'sm:w-3/4 h-1/2 sm:h-auto' : 'w-full'
                  } relative transition-[width] duration-300`}
                >
                  {/* Map Search Overlay */}
                  <div className="absolute top-4 left-4 right-4 sm:right-auto z-10">
                    <MapSearch onLocationSelect={handleLocationSearch} />
                  </div>

                  {/* Reset Button */}
                  <div className="absolute bottom-4 right-4 sm:bottom-auto sm:top-4 z-10">
                    <button
                      onClick={handleResetMap}
                      className={button('secondary', 'sm', 'bg-white shadow-card')}
                    >
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      <span>Reset</span>
                    </button>
                  </div>

                  <Map
                    ref={mapRef}
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/outdoors-v12"
                    mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
                  >
                    {Object.entries(groupedPhotos).map(([key, photoGroup]) => {
                      const firstPhoto = photoGroup[0];
                      const isMultiple = photoGroup.length > 1;
                      const place = firstPhoto.country || 'this location';

                      return (
                        <Marker
                          key={key}
                          longitude={firstPhoto.longitude || 0}
                          latitude={firstPhoto.latitude || 0}
                          anchor="bottom"
                          onClick={e => {
                            e.originalEvent.stopPropagation();
                            handleMarkerClick(photoGroup);
                          }}
                        >
                          {/* Marker's own onClick covers pointers; this button
                              is what makes the pin reachable by Tab, so it only
                              handles keys to avoid firing twice on click. */}
                          <button
                            type="button"
                            aria-label={`${photoGroup.length} ${
                              isMultiple ? 'photos' : 'photo'
                            } in ${place}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleMarkerClick(photoGroup);
                              }
                            }}
                            className={`${
                              isMultiple ? 'w-8 h-8' : 'w-6 h-6'
                            } bg-clay-600 hover:bg-clay-700 rounded-full border-2 border-white cursor-pointer flex items-center justify-center text-white text-xs font-bold tabular-nums shadow-card transition-colors ${focusRing}`}
                          >
                            {isMultiple ? photoGroup.length : ''}
                          </button>
                        </Marker>
                      );
                    })}
                  </Map>
                </div>

                {/* Sidebar */}
                {selectedLocation && (
                  <aside
                    aria-label="Photos at the selected location"
                    className="sm:w-1/4 flex-1 sm:flex-none bg-white border-t sm:border-t-0 sm:border-l border-sand-200 overflow-y-auto overscroll-contain"
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-4">
                        <h2 className="text-base font-semibold text-sand-900 min-w-0">
                          <span className="tabular-nums">{selectedLocation.length}</span>{' '}
                          {selectedLocation.length === 1 ? 'Photo' : 'Photos'} at This Location
                        </h2>
                        <button
                          onClick={() => setSelectedLocation(null)}
                          aria-label="Close location panel"
                          className={`flex-shrink-0 rounded p-1 text-sand-400 hover:text-sand-600 hover:bg-sand-100 transition-colors ${focusRing}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Photo Display */}
                      <ul className="space-y-4">
                        {selectedLocation.map((photo, index) => (
                          <li key={photo.id}>
                            <button
                              type="button"
                              onClick={(e) => openModal(index, e.currentTarget)}
                              className={`block w-full text-left bg-sand-50 rounded-xl p-3 hover:bg-sand-100 active:bg-sand-200 transition-colors border border-sand-100 ${focusRing}`}
                            >
                              <PhotoImage
                                src={photo.file_url}
                                alt={photo.title || 'Travel photo'}
                                width={400}
                                className="w-full h-48 object-cover rounded-lg mb-3 bg-sand-200"
                              />
                              <div className="space-y-1 min-w-0">
                                {photo.title && (
                                  <h3 className="font-semibold text-sm text-sand-900 break-words">
                                    {photo.title}
                                  </h3>
                                )}
                                <p className="text-xs text-sand-500 break-words">{photo.country}</p>
                                {photo.description && (
                                  <p className="text-xs text-sand-500 line-clamp-3 break-words">
                                    {photo.description}
                                  </p>
                                )}
                                <p className="text-xs text-sand-400 tabular-nums">
                                  {photoDate(photo)}
                                </p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </aside>
                )}
              </div>
            </Card>

            {!authLoading && user && !showPublicMap && photos.length > 0 && (
              <RecommendationsPanel
                photoCount={photos.length}
                onSelectPlace={handleLocationSearch}
              />
            )}

            {showPublicMap && (
              <CommunityRecommendationsPanel onSelectPlace={handleLocationSearch} />
            )}

            {/* Public-only: search_public_photos hardcodes `user_id IS NULL`,
                so this can never search the signed-in user's private map. */}
            {showPublicMap && (
              <Card className="p-6">
                <PhotoSearch onPhotoSelect={handleSearchPhotoSelect} />
              </Card>
            )}

            {photos.length > 0 && (
              <Card className="p-6" aria-labelledby="recent-photos-heading">
                <h2 id="recent-photos-heading" className="font-display text-xl font-bold text-sand-900 mb-4">
                  Recent Photos (<span className="tabular-nums">{photos.length}</span>)
                </h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visiblePhotos.map((photo, index) => (
                    <li
                      key={photo.id}
                      // Expanding to "all" can run well past 50 cards; letting
                      // the browser skip offscreen ones keeps that cheap without
                      // pulling in a virtual-list dependency.
                      className="[content-visibility:auto] [contain-intrinsic-size:auto_20rem]"
                    >
                      <button
                        type="button"
                        onClick={(e) => handleRecentPhotoClick(photo, e.currentTarget)}
                        className={`block w-full h-full text-left bg-sand-50 rounded-xl overflow-hidden hover:bg-sand-100 active:bg-sand-200 transition-colors border border-sand-100 ${focusRing}`}
                      >
                        <PhotoImage
                          src={photo.file_url}
                          alt={photo.title || 'Travel photo'}
                          width={600}
                          priority={index < 3}
                          className="w-full h-48 object-cover bg-sand-200"
                        />
                        <div className="p-4 min-w-0">
                          <h3 className="font-semibold text-sand-900 mb-1 break-words">
                            {photo.title}
                          </h3>
                          <div className="flex items-center text-sm text-sand-500 mb-2 min-w-0">
                            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
                            <span className="truncate">{photo.country}</span>
                          </div>
                          {photo.description && (
                            <p className="text-sm text-sand-500 line-clamp-2 break-words">
                              {photo.description}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {photos.length > PREVIEW_COUNT && (
                  <div className="mt-6 text-center">
                    <button onClick={toggleShowAll} className={button('secondary', 'md')}>
                      {showAllPhotos ? 'Show Fewer' : `Show All ${photos.length} Photos`}
                    </button>
                  </div>
                )}
              </Card>
            )}

            {photos.length === 0 && (
              <Card className="text-center py-12 px-6">
                <Camera className="h-16 w-16 text-sand-300 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-lg font-medium text-sand-900 mb-2">No Photos Yet</h2>
                <p className="text-sand-600 mb-4 text-pretty">
                  Be the first to share your travel photos on{' '}
                  <span translate="no">MercuryMap</span>.
                </p>
                <Link to="/upload" className={button('primary', 'md')}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  <span>Upload Your First Photo</span>
                </Link>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Fullscreen Modal */}
      {modalOpen && selectedLocation && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${currentPhotoIndex + 1} of ${selectedLocation.length}`}
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[9999] overflow-hidden overscroll-contain"
          onClick={handleModalClose}
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingRight: 'env(safe-area-inset-right)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            paddingLeft: 'env(safe-area-inset-left)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleModalClose}
            aria-label="Close photo viewer"
            autoFocus
            className={`absolute top-4 right-4 text-white hover:text-sand-300 transition-colors z-10 rounded-lg ${focusRing} focus-visible:ring-white focus-visible:ring-offset-black`}
          >
            <X className="w-8 h-8" aria-hidden="true" />
          </button>

          {/* Navigation Arrows */}
          {selectedLocation.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevPhoto();
                }}
                aria-label="Previous photo"
                className={`absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-sand-300 transition-colors z-10 rounded-lg ${focusRing} focus-visible:ring-white focus-visible:ring-offset-black`}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextPhoto();
                }}
                aria-label="Next photo"
                className={`absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-sand-300 transition-colors z-10 rounded-lg ${focusRing} focus-visible:ring-white focus-visible:ring-offset-black`}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Photo Display */}
          <div
            className="relative w-full h-full flex items-center justify-center p-4 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedLocation[currentPhotoIndex].file_url}
              alt={selectedLocation[currentPhotoIndex].title || 'Travel photo'}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />

            {/* Photo Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-xl">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  {selectedLocation[currentPhotoIndex].title && (
                    <h2 className="text-lg font-semibold mb-1 break-words">
                      {selectedLocation[currentPhotoIndex].title}
                    </h2>
                  )}
                  <p className="text-sm text-sand-300 mb-1 break-words">
                    {selectedLocation[currentPhotoIndex].country}
                  </p>
                  {selectedLocation[currentPhotoIndex].description && (
                    <p className="text-sm text-sand-300 mb-1 line-clamp-3 break-words">
                      {selectedLocation[currentPhotoIndex].description}
                    </p>
                  )}
                  <p className="text-xs text-sand-400 tabular-nums">
                    {photoDate(selectedLocation[currentPhotoIndex])}
                  </p>
                </div>
                {selectedLocation.length > 1 && (
                  <div className="text-sm text-sand-300 tabular-nums flex-shrink-0">
                    {currentPhotoIndex + 1} / {selectedLocation.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
