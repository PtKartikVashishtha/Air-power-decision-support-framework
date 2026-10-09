import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Stitch Daylight JAOC Defense System Tokens ──────────────────────
        // Surface hierarchy (light → dark)
        'background':               '#f6fafe',
        'surface':                  '#f6fafe',
        'surface-bright':           '#f6fafe',
        'surface-dim':              '#d6dade',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#f0f4f8',
        'surface-container':        '#eaeef2',
        'surface-container-high':   '#e4e9ed',
        'surface-container-highest':'#dfe3e7',
        'surface-variant':          '#dfe3e7',

        // On-surface text
        'on-background':            '#171c1f',
        'on-surface':               '#171c1f',
        'on-surface-variant':       '#43474d',
        'inverse-surface':          '#2c3134',
        'inverse-on-surface':       '#edf1f5',

        // Primary — deep navy #001428 (text, icons, borders)
        'primary':                  '#001428',
        'primary-container':        '#0f2942',
        'primary-fixed':            '#d1e4ff',
        'primary-fixed-dim':        '#b0c9e8',
        'on-primary':               '#ffffff',
        'on-primary-container':     '#7991af',
        'on-primary-fixed':         '#011d35',
        'on-primary-fixed-variant': '#314863',
        'inverse-primary':          '#b0c9e8',
        'surface-tint':             '#49607c',

        // Secondary — deep blue #006398 (interactive, CTAs)
        'secondary':                '#006398',
        'secondary-container':      '#5bb8fe',
        'secondary-fixed':          '#cce5ff',
        'secondary-fixed-dim':      '#93ccff',
        'on-secondary':             '#ffffff',
        'on-secondary-container':   '#00476e',
        'on-secondary-fixed':       '#001d31',
        'on-secondary-fixed-variant':'#004b73',

        // Tertiary — darkest navy (decorative)
        'tertiary':                 '#00132c',
        'tertiary-container':       '#07284c',
        'tertiary-fixed':           '#d5e3ff',
        'tertiary-fixed-dim':       '#adc8f5',
        'on-tertiary':              '#ffffff',
        'on-tertiary-container':    '#7690ba',
        'on-tertiary-fixed':        '#001c3b',
        'on-tertiary-fixed-variant':'#2d486d',

        // Error — #ba1a1a
        'error':                    '#ba1a1a',
        'error-container':          '#ffdad6',
        'on-error':                 '#ffffff',
        'on-error-container':       '#93000a',

        // Outline
        'outline':                  '#74777e',
        'outline-variant':          '#c3c6ce',

        // ── Dark Ops Palette (Maintained for fallback / TacticalMap) ────────
        ops: {
          950:     '#070b10',
          900:     '#0c131d',
          850:     '#111b29',
          800:     '#162436',
          700:     '#213650',
          600:     '#314e70',
          500:     '#486e9a',
          accent:  '#00e5ff',
          alert:   '#ff334b',
          warning: '#ffb300',
          success: '#00e676',
        },
      },

      spacing: {
        // Design token spacing — used with px-*, py-*, gap-*, p-* utilities
        // NOTE: CSS classes like .px-space-md are defined in globals.css @layer components
        'space-xs':       '0.125rem',   // 2px
        'space-sm':       '0.25rem',    // 4px
        'space-md':       '0.5rem',     // 8px
        'space-lg':       '0.75rem',    // 12px
        'space-xl':       '1rem',       // 16px
        'space-2xl':      '1.5rem',     // 24px
        'gutter':         '0.5rem',
        'gutter-desktop': '0.75rem',
        'margin':         '0.5rem',
        'margin-desktop': '1rem',
      },

      fontFamily: {
        // Only the two base families — referenced with font-sans / font-mono
        sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        // Expose custom sizes that exist in our design token scale
        '2xs': ['0.625rem',  { lineHeight: '1rem'   }],   // 10px
        'xs':  ['0.6875rem', { lineHeight: '1.125rem'}],   // 11px (override Tailwind default)
        'sm':  ['0.75rem',   { lineHeight: '1.25rem' }],   // 12px
      },

      borderRadius: {
        'sm':  '2px',
        'DEFAULT': '3px',
        'md':  '4px',
        'lg':  '6px',
      },

      boxShadow: {
        'xs':  '0 1px 2px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'sm':  '0 1px 3px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
