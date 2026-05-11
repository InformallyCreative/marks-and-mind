/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background palette — deep navy instead of pure gray for a more
        // saturated, slightly Fortnite-y mood.
        ink: {
          0: '#0a0e1f', // app background
          1: '#14182e', // cards
          2: '#1d2240', // inputs / inner panels
          3: '#2d3464', // borders, subtle controls
          4: '#6068a8', // muted text (lifted toward periwinkle)
        },
        // Primary — vivid Fortnite purple.
        accent: {
          DEFAULT: '#a855f7',
          soft: '#c4b5fd',
        },
        // Secondary — electric blue. Use for time/schedule cues and
        // knowledge-type mind nodes.
        sky: {
          DEFAULT: '#38bdf8',
          soft: '#7dd3fc',
        },
        // Completion / XP / wins — gold yellow.
        gold: {
          DEFAULT: '#facc15',
          soft: '#fde68a',
        },
        // Semantic aliases used across the app
        good: '#facc15', // done / hit / completed — gold
        warn: '#fb923c', // skipped / dropped — orange
        bad: '#f87171', // delete / error — red-pink
      },
      boxShadow: {
        glow: '0 0 24px -4px rgba(168, 85, 247, 0.55)',
        'glow-sky': '0 0 18px -2px rgba(56, 189, 248, 0.45)',
        'glow-gold': '0 0 18px -2px rgba(250, 204, 21, 0.45)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Inter"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
