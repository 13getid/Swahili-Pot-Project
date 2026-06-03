/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff4ff',
          100: '#dce8ff',
          200: '#b9d0fe',
          500: '#3b63d4',
          600: '#1e40af',
          700: '#1730a0',
          900: '#0f1e6b',
        },
        // Theme-aware semantic tokens (see index.css)
        canvas: 'var(--color-canvas)',
        card: 'var(--color-card)',
        line: 'var(--color-line)',
        ink: 'var(--color-ink)',
        subtle: 'var(--color-subtle)',
        hover: 'var(--color-hover)',
        accentSoft: 'var(--color-accent-soft)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
