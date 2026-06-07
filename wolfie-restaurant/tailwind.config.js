/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        elevated: 'var(--elevated)',
        surface: 'var(--surface)',
        border: 'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        muted: 'var(--muted)',
        'text-secondary': 'var(--text-secondary)',
        primary: { DEFAULT: 'var(--primary)', dim: 'var(--primary-dim)' },
        success: { DEFAULT: 'var(--success)', dim: 'var(--success-dim)' },
        warning: { DEFAULT: 'var(--warning)', dim: 'var(--warning-dim)' },
        danger: { DEFAULT: 'var(--danger)', dim: 'var(--danger-dim)' },
        info: { DEFAULT: 'var(--info)', dim: 'var(--info-dim)' },
      },
      fontFamily: { mono: ['JetBrains Mono', 'monospace'] },
    },
  },
  plugins: [],
}
