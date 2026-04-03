/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        surface2: 'var(--surface2)',
        border: 'var(--border)',
        path: 'var(--path)',
        'path-border': 'var(--path-border)',
        'tower-cell': 'var(--tower-cell)',
        green: 'var(--green)',
        gold: 'var(--gold)',
        red: 'var(--red)',
        blue: 'var(--blue)',
        purple: 'var(--purple)',
        text: 'var(--text)',
        'text-dim': 'var(--text-dim)',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        vt: ['"VT323"', 'monospace'],
      },
    },
  },
  plugins: [],
}
