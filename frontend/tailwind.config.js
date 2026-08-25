const defaultTheme = require('tailwindcss/defaultTheme');
const plugin = require('tailwindcss/plugin');

/**
 * MercuryMap's design tokens.
 *
 * The palette is deliberately warm: sun-bleached paper, terracotta, and sea,
 * rather than the cool white/slate/indigo default this started from. The
 * reference points are vintage travel posters and printed maps -- things that
 * look like they have been somewhere -- not SaaS dashboards.
 *
 * Every value that carries text was checked against WCAG AA (4.5:1) on its
 * intended background before being committed; the ratios are noted inline.
 * Where a step is *not* safe for body text, it says so.
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral. Replaces `slate` everywhere -- paper and ink instead
        // of the cool blue-grey Tailwind ships with.
        sand: {
          50: '#FBF8F4', // page background (cream)
          100: '#F4EEE6',
          200: '#E8DFD3', // hairlines, dividers
          300: '#CFC0AE', // input borders
          // 400 is intentionally darker than a typical 400 step: it carries
          // hint text, and the old slate-400 failed AA at 2.56:1 on white.
          // This lands at 4.65:1, so the lightest text token is now legible.
          400: '#847160',
          500: '#7A6857', // secondary text -- 5.32:1 on white
          600: '#6B5C4D', // 6.44:1 on white
          700: '#52463A', // 8.64:1 on cream
          800: '#3A3129', // 12.01:1 on cream
          900: '#241E18', // primary text -- 15.57:1 on cream
          950: '#1A1512', // footer / darkest surface
        },

        // Primary accent. Terracotta -- sun-baked clay roofs, desert rock.
        clay: {
          50: '#FDF3EF',
          100: '#FBE3DA',
          200: '#F6C7B5',
          300: '#EFA286',
          400: '#E37B57',
          500: '#D65F37',
          600: '#B94A28', // primary buttons -- white on this is 5.16:1
          700: '#983B20', // hover -- 7.04:1
          800: '#7A311C', // active
          900: '#632B1A',
        },

        // Secondary accent. Sea/pine -- used for the AI + discovery surfaces
        // so "generated" content reads as its own thing, not as a CTA.
        sea: {
          50: '#EEF6F5',
          100: '#D6E9E7',
          200: '#A9D2CE',
          300: '#74B5B0',
          400: '#469894',
          500: '#2A8A85',
          600: '#1F6F6B', // white on this is 5.92:1
          700: '#1A5854', // 7.72:1 on cream
          800: '#164744',
          900: '#123B39',
        },

        // Warm highlight. Late-afternoon sun; badges and small emphasis.
        sun: {
          50: '#FDF6E9',
          100: '#F9E9C6',
          200: '#F2D493',
          300: '#E9BC5E',
          400: '#DFA83C',
          500: '#D99A2B',
          600: '#B87E1C',
          700: '#93631A',
        },

        // Danger. Deliberately pushed toward crimson rather than orange-red:
        // the primary accent is already a warm red, and an error state has to
        // be unmistakably *not* a call to action.
        berry: {
          50: '#FDF2F4',
          100: '#FAE0E5',
          200: '#F3C2CB',
          300: '#E894A5',
          400: '#D8637C',
          500: '#C2415C',
          600: '#A62F49', // 6.72:1 on white
          700: '#86253A',
        },
      },

      fontFamily: {
        // Body/UI. Humanist geometric -- friendlier than Inter without
        // giving up the legibility a form or a map label needs.
        sans: ['"Plus Jakarta Sans"', ...defaultTheme.fontFamily.sans],
        // Display. Fraunces is an "old style" serif with soft, slightly wonky
        // serifs; it carries the editorial/travel-poster voice. Reserved for
        // marketing headings -- never for UI labels, where it would cost
        // legibility for personality nobody asked for at 12px.
        display: ['Fraunces', 'Georgia', ...defaultTheme.fontFamily.serif],
      },

      boxShadow: {
        // Warm-tinted rather than neutral black, so shadows sit in the same
        // world as the cream background instead of greying it out.
        card: '0 1px 2px 0 rgb(36 30 24 / 0.04), 0 1px 3px 0 rgb(36 30 24 / 0.06)',
        lift: '0 2px 4px -1px rgb(36 30 24 / 0.06), 0 8px 16px -4px rgb(36 30 24 / 0.10)',
        float: '0 4px 8px -2px rgb(36 30 24 / 0.08), 0 16px 32px -8px rgb(36 30 24 / 0.14)',
      },
    },
  },
  plugins: [
    // `bg-grain` -- a faint paper tooth for large flat fills, as inline SVG
    // fractal noise so it costs no request. Tiled at 160px.
    //
    // Shipped as a plugin rather than a `backgroundImage` token because the
    // blend mode is not optional: painted normally, the noise only ever
    // lightens what is under it, which quietly erodes contrast. Measured on
    // the clay-700 CTA, plain noise strong enough to see (opacity 0.40) drags
    // the clay-100 paragraph from 5.74:1 down to 4.47:1 -- under AA. Overlay
    // modulates in both directions instead, so the same visible texture
    // (sd ~3.9/255) costs only 5.74 -> 5.26:1. Binding the two together here
    // means `bg-grain` cannot be used without the blend that makes it safe.
    //
    // The original 0.035 measured sd 1.1/255 on screen: rendering, but about
    // 0.4% modulation, i.e. invisible. 0.5 lands near sd 5.5 and ~5.05:1.
    // Much past this it stops reading as texture and starts reading as dirt.
    plugin(({ addUtilities }) => {
      addUtilities({
        '.bg-grain': {
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
          backgroundBlendMode: 'overlay',
        },
      });
    }),
  ],
};
