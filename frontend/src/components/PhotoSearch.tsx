import React, { useState } from 'react';
import { AlertCircle, CalendarDays, Loader2, MapPin, Search, Sparkles } from 'lucide-react';
import { photoDate } from '../lib/photoDate.ts';
import PhotoImage from './PhotoImage.tsx';
import Card from './ui/Card.tsx';
import { button, focusRing } from './ui/buttonStyles.ts';
import {
  searchService,
  type PhotoSearchResult,
  type SearchPhoto,
} from '../services/searchService.ts';

interface PhotoSearchProps {
  /**
   * Optional map/modal hand-off for a result selected by the parent. The
   * clicked element is passed through so the parent can return focus to it
   * when its modal closes, the same way the Recent Photos grid does.
   */
  onPhotoSelect?: (photo: SearchPhoto, opener: HTMLElement | null) => void;
  placeholder?: string;
}

const PhotoSearch: React.FC<PhotoSearchProps> = ({
  onPhotoSelect,
  // Examples are deliberately drawn from what the corpus can actually answer.
  // Mood-and-activity prompts ("sunset beaches") return nothing until photos
  // carry descriptions to match against, since tsv is built from title,
  // country, and description -- never from the image itself.
  placeholder = 'Try "espania" or "inca"',
}) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<PhotoSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyQuery, setEmptyQuery] = useState(false);
  const [searched, setSearched] = useState(false);

  const submitSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setEmptyQuery(true);
      setError(null);
      setResult(null);
      setSearched(false);
      return;
    }

    setEmptyQuery(false);
    setError(null);
    setLoading(true);
    setSearched(true);

    try {
      const nextResult = await searchService.search(trimmedQuery);
      setResult(nextResult);
    } catch (searchError) {
      // Search errors are user-visible: a rejected API key, missing migration,
      // and a network outage need different action than an empty result. The
      // service preserves the endpoint's actual message for this state.
      console.error('Photo search request failed:', searchError);
      setResult(null);
      setError(
        searchError instanceof Error ? searchError.message : 'Could not search photos.'
      );
    } finally {
      setLoading(false);
    }
  };

  const hasResults = Boolean(result && result.photos.length > 0);

  return (
    <section aria-labelledby="photo-search-heading" className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 id="photo-search-heading" className="text-xl font-bold text-slate-900">
            Search public photos
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Describe a place, mood, activity, or time and we’ll find matching public photos.
        </p>
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="photo-search-input" className="sr-only">
          Search photos
        </label>
        <input
          id="photo-search-input"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (emptyQuery) setEmptyQuery(false);
          }}
          placeholder={placeholder}
          maxLength={500}
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          aria-describedby="photo-search-help"
          aria-invalid={Boolean(error || emptyQuery)}
        />
        <button type="submit" className={button('primary', 'lg', 'sm:min-w-[7rem]')} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <Search className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{loading ? 'Searching…' : 'Search'}</span>
        </button>
      </form>
      <p id="photo-search-help" className="text-xs text-slate-400">
        Search works across photo names, places, descriptions, and dates.
      </p>

      {emptyQuery && (
        <p role="status" className="flex items-center gap-2 text-sm text-slate-600">
          <Search className="h-4 w-4 text-indigo-500" aria-hidden="true" />
          Enter a search phrase to find photos.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {result?.degraded && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"
        >
          <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>
            {result.note ??
              'Full semantic search needs the semantic search migration. Showing the available matches for now.'}
          </span>
        </div>
      )}

      {searched && !loading && !error && !hasResults && (
        <Card className="px-5 py-8 text-center">
          <Search className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-700">No matching photos found.</p>
          <p className="mt-1 text-sm text-slate-500">
            Try a broader place, activity, or description.
          </p>
        </Card>
      )}

      {hasResults && result && (
        <ul
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-live="polite"
          aria-label={`${result.photos.length} photo search results`}
        >
          {result.photos.map((photo) => {
            const body = (
              <>
                <PhotoImage
                  src={photo.file_url}
                  alt={photo.title || 'Travel photo'}
                  width={640}
                  className="h-48 w-full bg-slate-200 object-cover"
                />
                <div className="min-w-0 p-4">
                  <h3 className="truncate font-semibold text-slate-900">
                    {photo.title || 'Untitled photo'}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    {photo.country && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                        <span className="truncate">{photo.country}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                      {photoDate(photo)}
                    </span>
                  </div>
                  {photo.description && (
                    <p className="mt-3 line-clamp-2 break-words text-sm text-slate-600">
                      {photo.description}
                    </p>
                  )}
                </div>
              </>
            );

            return (
              <li key={photo.id}>
                {onPhotoSelect ? (
                  <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                    <button
                      type="button"
                      onClick={(event) => onPhotoSelect(photo, event.currentTarget)}
                      aria-label={`Open ${photo.title || 'this photo'}`}
                      className={`block w-full text-left ${focusRing}`}
                    >
                      {body}
                    </button>
                  </Card>
                ) : (
                  <Card className="h-full overflow-hidden">{body}</Card>
                )}
              </li>
            );
          })}
        </ul>
      )}

    </section>
  );
};

export default PhotoSearch;
