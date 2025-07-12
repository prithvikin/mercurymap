import React, { useState, useEffect, useRef, useCallback } from 'react';
import Map, { Marker } from 'react-map-gl';
import { photoService } from '../services/photoService.ts';
import { Photo } from '../lib/supabase.ts';
import { Camera, MapPin, Upload, Home as HomeIcon, LogIn, LogOut, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import MapSearch from '../components/MapSearch.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';

const Home: React.FC = () => {
  const { user, signOut } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Photo[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const mapRef = useRef<any>(null);

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

  useEffect(() => {
    fetchPhotos();
  }, [user]);

  const fetchPhotos = useCallback(async () => {
    try {
      let data;
      if (user) {
        // Fetch user's private photos
        data = await photoService.getUserPhotos(user.id);
      } else {
        // Fetch public photos
        data = await photoService.getAllPhotos();
      }
      setPhotos(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [user]);

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

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setCurrentPhotoIndex(0);
  };

  const handleNextPhoto = () => {
    if (selectedLocation) {
      setCurrentPhotoIndex((prev) => 
        prev === selectedLocation.length - 1 ? 0 : prev + 1
      );
    }
  };

  const handlePrevPhoto = () => {
    if (selectedLocation) {
      setCurrentPhotoIndex((prev) => 
        prev === 0 ? selectedLocation.length - 1 : prev - 1
      );
    }
  };

  const handleRecentPhotoClick = (photo: Photo) => {
    // Find if this photo is already in a group, or create a single photo group
    const photoGroup = [photo];
    setSelectedLocation(photoGroup);
    setCurrentPhotoIndex(0);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <HomeIcon className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">MercuryMap</h1>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            )}
            <Link
              to="/upload"
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Photo</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {user ? 'Your Private MercuryMap' : 'Public MercuryMap'}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {user 
            ? 'View your private travel photos on the map. Your photos are only visible to you.'
            : 'Click on the map markers to view public photos taken in different countries. Sign in to view your private map.'
          }
        </p>
        {!user && (
          <div className="mt-4">
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In to View Your Private Map</span>
            </Link>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex" style={{ height: '600px' }}>
          {/* Map Container - 75% width when sidebar is open, 100% when closed */}
          <div className={`${selectedLocation ? 'w-3/4' : 'w-full'} relative transition-all duration-300`}>
            {/* Map Search Overlay */}
            <div className="absolute top-4 left-4 z-10">
              <MapSearch onLocationSelect={handleLocationSearch} />
            </div>
            
            {/* Reset Button */}
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={handleResetMap}
                className="bg-white hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-md shadow-md border border-gray-300 transition-colors flex items-center space-x-2"
                title="Reset map to world view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset</span>
              </button>
            </div>
            
            <Map
              ref={mapRef}
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              style={{ width: '100%', height: '100%' }}
              mapStyle="mapbox://styles/mapbox/streets-v11"
              mapboxAccessToken={process.env.REACT_APP_MAPBOX_TOKEN}
            >
              {Object.entries(groupedPhotos).map(([key, photoGroup]) => {
                const firstPhoto = photoGroup[0];
                const isMultiple = photoGroup.length > 1;
                
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
                    <div className={`${isMultiple ? 'w-8 h-8' : 'w-6 h-6'} bg-blue-600 rounded-full border-2 border-white cursor-pointer flex items-center justify-center text-white text-xs font-bold`}>
                      {isMultiple ? photoGroup.length : ''}
                    </div>
                  </Marker>
                );
              })}
            </Map>
          </div>

          {/* Sidebar - 25% width when open */}
          {selectedLocation && (
            <div className="w-1/4 bg-white border-l border-gray-200 overflow-y-auto">
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedLocation.length} Photo{selectedLocation.length > 1 ? 's' : ''} at this location
                  </h3>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Photo Display */}
                <div className="space-y-4">
                  {selectedLocation.map((photo, index) => (
                    <div 
                      key={photo.id} 
                      className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handlePhotoClick(index)}
                    >
                      <div className="relative">
                        <img
                          src={photo.file_url}
                          alt={photo.title || 'Photo'}
                          className="w-full h-48 object-cover rounded mb-3 hover:opacity-90 transition-opacity"
                        />

                      </div>
                      <div className="space-y-2">
                        {photo.title && (
                          <h4 className="font-semibold text-sm">{photo.title}</h4>
                        )}
                        <p className="text-xs text-gray-600">{photo.country}</p>
                        {photo.description && (
                          <p className="text-xs text-gray-500">{photo.description}</p>
                        )}
                        <p className="text-xs text-gray-400">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Recent Photos ({photos.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.slice(0, 6).map((photo) => (
              <div 
                key={photo.id} 
                className="bg-gray-50 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleRecentPhotoClick(photo)}
              >
                <div className="relative">
                  <img
                    src={photo.file_url}
                    alt={photo.title}
                    className="w-full h-48 object-cover"
                  />

                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{photo.title}</h3>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {photo.country}
                  </div>
                  {photo.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{photo.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos yet</h3>
          <p className="text-gray-600 mb-4">
            Be the first to share your travel photos on MercuryMap!
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Your First Photo</span>
          </Link>
        </div>
      )}

      {/* Fullscreen Modal */}
      {modalOpen && selectedLocation && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[9999]"
          style={{
            margin: 0,
            padding: 0,
            width: '100vw',
            height: '100vh',
            overflow: 'hidden'
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleModalClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Navigation Arrows */}
          {selectedLocation.length > 1 && (
            <>
              <button
                onClick={handlePrevPhoto}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={handleNextPhoto}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Photo Display */}
          <div className="relative w-full h-full flex items-center justify-center p-8">
            <img
              src={selectedLocation[currentPhotoIndex].file_url}
              alt={selectedLocation[currentPhotoIndex].title || 'Photo'}
              className="max-w-[90vw] max-h-[80vh] object-contain"
            />
            
            {/* Photo Info */}
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  {selectedLocation[currentPhotoIndex].title && (
                    <h3 className="text-lg font-semibold mb-1">
                      {selectedLocation[currentPhotoIndex].title}
                    </h3>
                  )}
                  <p className="text-sm text-gray-300 mb-1">
                    {selectedLocation[currentPhotoIndex].country}
                  </p>
                  {selectedLocation[currentPhotoIndex].description && (
                    <p className="text-sm text-gray-300 mb-1">
                      {selectedLocation[currentPhotoIndex].description}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {new Date(selectedLocation[currentPhotoIndex].created_at).toLocaleDateString()}
                  </p>
                </div>
                {selectedLocation.length > 1 && (
                  <div className="text-sm text-gray-300">
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