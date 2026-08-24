import React from 'react';
import { MapPin } from 'lucide-react';
import { focusRing } from './buttonStyles.ts';

interface SuggestionCardProps {
  place: string;
  country: string;
  reason: string;
  /** Omit to render a static card -- the Landing teaser has no map to pan. */
  onSelect?: () => void;
}

const surface =
  'block w-full text-left bg-slate-50 border border-slate-100 rounded-xl p-4 transition-colors';

/**
 * One AI-suggested destination. Rendered as a real <button> when it's
 * actionable so it's reachable by Tab and activates on Enter and Space --
 * a div with onClick gave neither.
 */
const SuggestionCard: React.FC<SuggestionCardProps> = ({ place, country, reason, onSelect }) => {
  const body = (
    <>
      <h3 className="font-semibold text-slate-900 mb-1 break-words">{place}</h3>
      <div className="flex items-center text-sm text-slate-500 mb-2 min-w-0">
        <MapPin className="h-4 w-4 mr-1 flex-shrink-0" aria-hidden="true" />
        <span className="truncate">{country}</span>
      </div>
      <p className="text-sm text-slate-500 break-words">{reason}</p>
    </>
  );

  if (!onSelect) {
    return <div className={surface}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Show ${place}, ${country} on the map`}
      className={`${surface} hover:bg-slate-100 hover:border-slate-300 active:bg-slate-200 ${focusRing}`}
    >
      {body}
    </button>
  );
};

export default SuggestionCard;
