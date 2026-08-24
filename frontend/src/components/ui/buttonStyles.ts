export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
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
