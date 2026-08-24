export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * The focus ring every interactive element in the app shares. Exported on its
 * own so plain links and custom controls (map markers, photo cards) get the
 * same ring as a `button()` without having to restate it.
 */
export const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold transition-colors ' +
  'touch-manipulation ' +
  focusRing +
  ' disabled:opacity-50 disabled:cursor-not-allowed';

// Each state is a step further from the resting colour, so hover reads as
// lighter than active and neither can be confused for the idle button.
const variants: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:bg-indigo-800',
  secondary:
    'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200',
  danger: 'bg-white text-red-600 border border-slate-300 hover:bg-red-50 hover:border-red-300 active:bg-red-100',
  // For a primary action on a solid dark/colored background (e.g. inside the
  // bg-indigo-600 CTA cards), where `primary`'s own bg-indigo-600/text-white
  // would need overriding. Do NOT build this by passing an override
  // className to button('primary', ...) instead -- the variant's own
  // bg-indigo-600 and text-white classes stay in the string alongside the
  // override, and Tailwind's generated CSS order (not the string's order)
  // decides which of each colliding pair wins independently per property.
  // That previously produced a white background with white text: invisible.
  // (base's default focus-visible:ring-indigo-500 is left as-is here for the
  // same reason -- it already reads clearly against a white button, and
  // adding a competing ring-color override here would recreate the exact
  // same collision this variant exists to avoid.)
  inverse: 'bg-white text-indigo-600 shadow-sm hover:bg-indigo-50 active:bg-indigo-100',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'rounded-lg px-3 py-1.5 text-sm',
  md: 'rounded-lg px-4 py-2 text-sm',
  lg: 'rounded-xl px-6 py-3 text-base',
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
