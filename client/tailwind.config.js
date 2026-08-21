/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#fafafa',
        foreground: '#09090b',
        muted: '#f4f4f5',
        'muted-foreground': '#71717a',
        card: '#ffffff',
        'card-foreground': '#09090b',
        border: '#e4e4e7',
        input: '#e4e4e7',
        primary: {
          DEFAULT: '#18181b', // Minimal neutral dark slate
          foreground: '#fafafa',
        },
        accent: {
          DEFAULT: '#4f46e5', // Sleek indigo accent
          light: '#eeeffe',
          foreground: '#ffffff',
        },
        danger: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        success: {
          DEFAULT: '#10b981',
          foreground: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        lg: '10px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.02), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
};
