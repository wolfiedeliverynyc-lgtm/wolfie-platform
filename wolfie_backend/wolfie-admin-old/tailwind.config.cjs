/* eslint-disable @typescript-eslint/no-require-imports */
// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'], // enable class strategy
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0EA5E9', // sky-500
        background: '#ffffff',
        foreground: '#171717',
        muted: '#f5f5f5',
        border: '#e5e5e5',
      },
      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
        32: '8rem',
      },
      borderRadius: {
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.5rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio')],
};
