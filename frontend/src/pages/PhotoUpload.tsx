import React, { useState, useCallback, useEffect } from 'react';
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
import Spinner from '../components/ui/Spinner.tsx';
import { button, focusRing } from '../components/ui/buttonStyles.ts';

// Coordinates are numbers in a fixed-precision column, so they get the reader's
// decimal separator rather than a hardcoded "12.3456".
const coordFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const fieldClasses =
  'mt-1 block w-full px-3 py-2 border rounded-lg sm:text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-clay-500';

const PhotoUpload: React.FC = () => {
  const { user } = useAuth();
  // Only the two fields the form actually has inputs for. The country and
  // coordinates come off `selectedLocation` at submit time, not from here.
  const [formData, setFormData] = useState({
    description: '',
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
  const [errors, setErrors] = useState<{ file?: string; location?: string }>({});
  const navigate = useNavigate();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      setErrors((prev) => ({ ...prev, file: undefined }));
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

  // A half-filled upload is real work; a stray back-button or tab close would
  // silently discard the file and the location lookup.
  const isDirty =
    !loading &&
    (selectedFile != null ||
      selectedLocation != null ||
      formData.description !== '' ||
      formData.taken_date !== '');

  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

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

    // Every insert policy requires auth.uid() IS NOT NULL (see
    // supabase/policies.sql) -- a signed-out request has auth.uid() = NULL
    // and always fails RLS. The submit button is disabled for this case too;
    // this guard covers a stale enabled button or an Enter-key submit.
    if (!user) {
      toast.error('Sign in to upload photos.');
      return;
    }

    const nextErrors: { file?: string; location?: string } = {};
    if (!selectedFile) {
      nextErrors.file = 'Choose a photo to upload — drag one in or click to browse.';
    }
    if (!selectedLocation) {
      nextErrors.location = 'Search for a place and pick it from the list to set the location.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      // Send focus to whichever field is the first to fail.
      const target = document.getElementById(nextErrors.file ? 'photo-dropzone' : 'location');
      target?.focus();
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await photoService.uploadPhoto(
        selectedFile!,
        selectedLocation!.city || 'Untitled',
        formData.description,
        selectedLocation!.country,
        selectedLocation!.lat,
        selectedLocation!.lng,
        formData.taken_date || null,
        uploadToPublic ? undefined : user.id
      );

      toast.success('Photo uploaded successfully.');
      navigate(user ? '/app' : '/');
    } catch (error: any) {
      toast.error(
        error.message
          ? `${error.message} Check your connection and try again.`
          : 'Upload failed. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Only meaningful once signed in -- a signed-out visitor has no valid
  // destination at all, public or private (see the RLS note in handleSubmit).
  const destination = uploadToPublic ? 'the Public' : 'Your Private';

  return (
    <div className="min-h-screen bg-sand-50">
      <NavBar />

      <main id="main-content" className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h1 className="font-display text-xl font-bold text-sand-900 text-balance">
              {user ? (
                <>
                  Upload Photo to {destination} <span translate="no">MercuryMap</span>
                </>
              ) : (
                <>
                  Sign In to Upload a Photo to <span translate="no">MercuryMap</span>
                </>
              )}
            </h1>
            {user && (
              <div className="flex items-center gap-2 text-sm text-sand-500 min-w-0">
                <User className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
          </div>

          {user && (
            <div className="mb-4">
              <label htmlFor="upload-to-public" className="inline-flex items-center cursor-pointer">
                <input
                  id="upload-to-public"
                  type="checkbox"
                  checked={uploadToPublic}
                  onChange={() => setUploadToPublic(!uploadToPublic)}
                  aria-describedby="upload-to-public-hint"
                  className={`h-4 w-4 rounded border-sand-300 text-clay-600 ${focusRing}`}
                />
                <span className="ml-2 text-sm text-sand-700">
                  Upload to{' '}
                  <span className="font-semibold">
                    public <span translate="no">MercuryMap</span>
                  </span>
                </span>
              </label>
              <p id="upload-to-public-hint" className="text-xs text-sand-500 mt-1">
                Visible to everyone on the public map. Leave it unchecked to keep this in your own
                private map.
              </p>
            </div>
          )}

          {!user && (
            <div className="mb-6 p-4 bg-clay-50 border border-clay-100 rounded-xl">
              <p className="text-sm text-clay-800 mb-2">
                Sign in to upload photos. Uploads aren’t possible while signed out.
              </p>
              <Link
                to="/login"
                className={`inline-flex items-center gap-2 rounded px-1 text-clay-600 hover:text-clay-700 hover:underline text-sm font-medium ${focusRing}`}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                <span>Sign In</span>
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div>
              <span id="photo-label" className="block text-sm font-medium text-sand-700 mb-2">
                Photo
              </span>
              {!selectedFile ? (
                <div
                  {...getRootProps({
                    id: 'photo-dropzone',
                    'aria-labelledby': 'photo-label',
                    'aria-describedby': errors.file ? 'photo-error' : 'photo-hint',
                    'aria-invalid': Boolean(errors.file),
                  })}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${focusRing} ${
                    errors.file
                      ? 'border-berry-400 bg-berry-50'
                      : isDragActive
                        ? 'border-clay-500 bg-clay-50'
                        : 'border-sand-300 hover:border-sand-400 hover:bg-sand-50'
                  }`}
                >
                  {/* react-dropzone puts a real <input type="file"> here and
                      wires the root for keyboard activation, so Enter/Space on
                      the zone opens the picker -- drag is never the only way. */}
                  <input {...getInputProps()} aria-labelledby="photo-label" />
                  <FileImage className="h-10 w-10 text-sand-400 mx-auto mb-4" aria-hidden="true" />
                  {isDragActive ? (
                    <p className="text-clay-600">Drop the photo here…</p>
                  ) : (
                    <p className="text-sand-600 text-sm">
                      Drag and drop a photo here, or click to select
                    </p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={preview!}
                    alt={`Preview of ${selectedFile.name}`}
                    width={1200}
                    height={800}
                    className="w-full h-64 object-cover rounded-xl bg-sand-100"
                  />
                  <button
                    type="button"
                    onClick={removeFile}
                    aria-label={`Remove ${selectedFile.name}`}
                    className={`absolute top-2 right-2 p-1.5 bg-white text-sand-700 rounded-full shadow-card hover:bg-sand-50 active:bg-sand-100 transition-colors ${focusRing}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
              {errors.file ? (
                <p id="photo-error" className="mt-1.5 text-sm text-berry-600">
                  {errors.file}
                </p>
              ) : (
                !selectedFile && (
                  <p id="photo-hint" className="mt-1.5 text-xs text-sand-500">
                    JPG, PNG, GIF, or WebP.
                  </p>
                )
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-sand-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                className={`${fieldClasses} border-sand-300`}
                placeholder="A rainy morning in the old town…"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-sand-700 mb-1">
                Location
              </label>
              <LocationSearch
                id="location"
                aria-describedby={errors.location ? 'location-error' : undefined}
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                  setErrors((prev) => ({ ...prev, location: undefined }));
                }}
                placeholder="Search for a city or country…"
              />
              {errors.location && (
                <p id="location-error" className="mt-1.5 text-sm text-berry-600">
                  {errors.location}
                </p>
              )}
              {selectedLocation && (
                <div
                  role="status"
                  className="mt-2 p-3 bg-sea-50 border border-sea-200 rounded-xl"
                >
                  <p className="text-sm text-sea-800 break-words">
                    Selected: {selectedLocation.city}, {selectedLocation.country}
                  </p>
                  <p className="text-xs text-sea-600 tabular-nums">
                    Coordinates: {coordFormat.format(selectedLocation.lat)},{' '}
                    {coordFormat.format(selectedLocation.lng)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="taken_date" className="block text-sm font-medium text-sand-700">
                Date Taken
              </label>
              <input
                type="date"
                id="taken_date"
                name="taken_date"
                value={formData.taken_date}
                onChange={handleChange}
                autoComplete="off"
                max={new Date().toISOString().slice(0, 10)}
                className={`${fieldClasses} border-sand-300`}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {/* Enabled until the request starts (a missing photo or location
                  gets an inline message, not a button that does nothing) --
                  except while signed out, which can never pass RLS. */}
              <button
                type="submit"
                disabled={loading || !user}
                className={button('primary', 'lg', 'flex-1')}
              >
                {loading ? (
                  <>
                    <Spinner label="Uploading your photo…" className="h-4 w-4" />
                    <span>Uploading…</span>
                  </>
                ) : user ? (
                  <span>Upload Photo</span>
                ) : (
                  <span>Sign In to Upload</span>
                )}
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
      </main>
    </div>
  );
};

export default PhotoUpload;
