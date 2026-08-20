import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { X, FileImage, User, LogIn } from 'lucide-react';
import { photoService } from '../services/photoService.ts';
import toast from 'react-hot-toast';
import LocationSearch from '../components/LocationSearch.tsx';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Link } from 'react-router-dom';
import NavBar from '../components/NavBar.tsx';
import Card from '../components/ui/Card.tsx';
import { button } from '../components/ui/buttonStyles.ts';

const PhotoUpload: React.FC = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    description: '',
    country: '',
    latitude: '',
    longitude: '',
    taken_date: ''
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    city: string;
    country: string;
  } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadToPublic, setUploadToPublic] = useState(false);
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error('Please select a photo to upload');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location for your photo');
      return;
    }

    setLoading(true);

    try {
      await photoService.uploadPhoto(
        selectedFile,
        selectedLocation.city || 'Untitled',
        formData.description,
        selectedLocation.country,
        selectedLocation.lat,
        selectedLocation.lng,
        formData.taken_date || null,
        (user && user.email === 'mercurymap725@gmail.com' && uploadToPublic) ? undefined : user?.id
      );

      toast.success('Photo uploaded successfully!');
      navigate(user ? '/app' : '/');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-slate-900">
              Upload Photo to {user ? (user.email === 'mercurymap725@gmail.com' && uploadToPublic ? 'the Public' : 'Your Private') : 'the Public'} MercuryMap
            </h1>
            {user && (
              <div className="flex items-center space-x-2 text-sm text-slate-500">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          {user && user.email === 'mercurymap725@gmail.com' && (
            <div className="mb-4">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={uploadToPublic}
                  onChange={() => setUploadToPublic(!uploadToPublic)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-slate-700">
                  Upload to <span className="font-semibold">public MercuryMap</span>
                </span>
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Only you can upload to the public map. Unchecked = private map.
              </p>
            </div>
          )}

          {user && user.email !== 'mercurymap725@gmail.com' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                Your uploads will go to your private map.
              </p>
            </div>
          )}
          {!user && (
            <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-sm text-indigo-800 mb-2">
                Sign in to upload to your private map.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center space-x-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Photo
              </label>
              {!selectedFile ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <FileImage className="h-10 w-10 text-slate-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-indigo-600">Drop the photo here...</p>
                  ) : (
                    <p className="text-slate-600 text-sm">Drag and drop a photo here, or click to select</p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={preview!}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 p-1.5 bg-white text-slate-700 rounded-full shadow-card hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Tell us about this photo..."
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700">
                Location
              </label>
              <LocationSearch
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                  setFormData(prev => ({
                    ...prev,
                    country: location.country,
                    latitude: location.lat.toString(),
                    longitude: location.lng.toString()
                  }));
                }}
                placeholder="Search for a city or country..."
              />
              {selectedLocation && (
                <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-sm text-emerald-800">
                    Selected: {selectedLocation.city}, {selectedLocation.country}
                  </p>
                  <p className="text-xs text-emerald-600">
                    Coordinates: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="taken_date" className="block text-sm font-medium text-slate-700">
                Date Taken
              </label>
              <input
                type="date"
                id="taken_date"
                name="taken_date"
                value={formData.taken_date}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading || !selectedFile}
                className={button('primary', 'lg', 'flex-1')}
              >
                {loading ? 'Uploading...' : 'Upload Photo'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className={button('secondary', 'lg')}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PhotoUpload;
