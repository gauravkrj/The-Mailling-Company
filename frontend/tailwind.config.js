/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0F0D0E',
        foreground: '#F2EDEE',
        surface: {
          DEFAULT: '#1A1617',
          elevated: '#241E20',
        },
        muted: {
          DEFAULT: '#241E20',
          foreground: '#A89DA0',
        },
        card: {
          DEFAULT: '#1A1617',
          foreground: '#F2EDEE',
        },
        border: 'rgba(255, 255, 255, 0.08)',
        input: 'rgba(255, 255, 255, 0.1)',
        accent: {
          DEFAULT: '#7B2038',
          hover: '#9C3A54',
          foreground: '#F2EDEE',
        },
        status: {
          success: '#4A9D6E',
          warning: '#C89B4A',
          error: '#C24444',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        xl: '14px',
        lg: '12px',
        md: '8px',
        sm: '6px',
      },
      boxShadow: {
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
        subtle: '0 2px 8px 0 rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};
