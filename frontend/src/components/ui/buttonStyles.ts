export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The focus ring every interactive element in the app shares. Exported on its
 * own so plain links and custom controls (map markers, photo cards) get the
 * same ring as a `button()` without having to restate it.
 */
export const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-clay-500';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors ' +
  'touch-manipulation ' +
  focusRing +
  ' disabled:opacity-50 disabled:cursor-not-allowed';

// Each state is a step further from the resting colour, so hover reads as
// lighter than active and neither can be confused for the idle button.
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-clay-600 text-white shadow-card hover:bg-clay-700 active:bg-clay-800',
  secondary:
    'bg-white text-sand-700 border border-sand-300 hover:bg-sand-50 hover:border-sand-400 active:bg-sand-100',
  ghost: 'bg-transparent text-sand-600 hover:bg-sand-100 hover:text-sand-900 active:bg-sand-200',
  danger: 'bg-white text-berry-600 border border-sand-300 hover:bg-berry-50 hover:border-berry-300 active:bg-berry-100',
  // For a primary action on a solid dark/colored background (e.g. inside the
  // bg-clay-700 CTA card), where `primary`'s own bg-clay-600/text-white
  // would need overriding. Do NOT build this by passing an override
  // className to button('primary', ...) instead -- the variant's own
  // bg-clay-600 and text-white classes stay in the string alongside the
  // override, and Tailwind's generated CSS order (not the string's order)
  // decides which of each colliding pair wins independently per property.
  // That previously produced a white background with white text: invisible.
  // (base's default focus-visible:ring-clay-500 is left as-is here for the
  // same reason -- it already reads clearly against a white button, and
  // adding a competing ring-color override here would recreate the exact
  // same collision this variant exists to avoid.)
  inverse: 'bg-white text-clay-600 shadow-card hover:bg-clay-50 active:bg-clay-100',
};

// Radii are one step rounder than before at md/lg. Softer corners read
// friendlier next to a serif display face and a warm palette; sm stays at
// rounded-lg because a 12px radius on a 28px-tall control starts to look
// like a pill by accident.
const sizes: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-sm',
  md: 'rounded-xl px-4 py-2 text-sm',
  lg: 'rounded-2xl px-6 py-3 text-base',
};

// A plain class-string builder, not a component, so the same styling applies
// whether it lands on a <button> or a react-router <Link> rendered as an <a>.
export function button(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = ''
): string {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(' ');
}
