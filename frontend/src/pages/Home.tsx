import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import { photoService } from '../services/photoService';
import { Photo } from '../lib/supabase';
import { Camera, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const Home: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const data = await photoService.getAllPhotos();
      setPhotos(data);
    } catch (error) {
      console.error('Error fetching photos:', error);
      toast.error('Failed to load photos');
    } finally {
      setLoading(false);
    }
  };

  // Custom marker icon
  const customIcon = new Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyQzIgMTcuNTIgNi40OCAyMiAxMiAyMkMxNy41MiAyMiAyMiAxNy41MiAyMiAxMkMyMiA2LjQ4IDE3LjUyIDIgMTIgMloiIGZpbGw9IiMzQjgyRjYiLz4KPHBhdGggZD0iTTEyIDZDNi40OCA2IDIgMTAuNDggMiAxNkMyIDIxLjUyIDYuNDggMjYgMTIgMjZDMjEuNTIgMjYgMjYgMjEuNTIgMjYgMTZDMjYgMTAuNDggMjEuNTIgNiAxMiA2WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTEyIDEwQzEwLjM0IDEwIDkgMTEuMzQgOSAxM0M5IDE0LjY2IDEwLjM0IDE2IDEyIDE2QzEzLjY2IDE2IDE1IDE0LjY2IDE1IDEzQzE1IDExLjM0IDEzLjY2IDEwIDEyIDEwWiIgZmlsbD0iIzNCODJGNiIvPgo8L3N2Zz4K',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Explore Photos Around the World
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Click on the map markers to view photos taken in different countries. 
          Share your own travel memories by uploading photos to the map.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="h-96 md:h-[600px] relative">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            className="z-10"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {photos.map((photo) => (
              <Marker
                key={photo.id}
                position={[photo.latitude || 0, photo.longitude || 0]}
                icon={customIcon}
              >
                <Popup>
                  <div className="photo-popup">
                    <img
                      src={photo.file_url}
                      alt={photo.title}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <h3 className="font-semibold text-sm mb-1">{photo.title}</h3>
                    <p className="text-xs text-gray-600 mb-1">{photo.country}</p>
                    {photo.description && (
                      <p className="text-xs text-gray-500">{photo.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Recent Photos ({photos.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.slice(0, 6).map((photo) => (
              <div key={photo.id} className="bg-gray-50 rounded-lg overflow-hidden">
                <img
                  src={photo.file_url}
                  alt={photo.title}
                  className="w-full h-48 object-cover"
                />
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
            Be the first to share your travel photos on the map!
          </p>
        </div>
      )}
    </div>
  );
};

export default Home; 