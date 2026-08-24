import React from 'react';

interface SpinnerProps {
  /** What is being waited on, e.g. "Loading photos". Announced, not drawn. */
  label: string;
  className?: string;
}

/**
 * The app's one busy indicator. It carries its own live region because a bare
 * spinning <div> tells a screen reader nothing -- the ring is `aria-hidden` and
 * the label is what actually gets announced. `prefers-reduced-motion` stops the
 * spin globally (see index.css), and the label still reports the wait.
 */
const Spinner: React.FC<SpinnerProps> = ({ label, className = 'h-6 w-6' }) => (
  <span role="status" className="inline-flex items-center justify-center">
    <span
      aria-hidden="true"
      className={`animate-spin rounded-full border-2 border-current border-b-transparent ${className}`}
    />
    <span className="sr-only">{label}</span>
  </span>
);

export default Spinner;
