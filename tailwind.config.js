/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef3ff',
          100: '#e0e8ff',
          200: '#c7d4fe',
          300: '#a4b5fd',
          400: '#818dfb',
          500: '#6366f1',
          600: '#3479fb',
          700: '#1d5af0',
          800: '#1746dc',
          900: '#1a378d',
          950: '#0f1f5c',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
      },
      borderWidth: {
        3: '3px',
      },
      spacing: {
        4.5: '1.125rem',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(52, 121, 251, 0.4)',
        'glow-accent': '0 0 20px rgba(16, 185, 129, 0.35)',
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.04)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.4s ease-out both',
        'fade-in-fast': 'fadeIn 0.15s ease-out both',
        'slide-up': 'slideUp 0.35s ease-out both',
        'slide-down': 'slideDown 0.3s ease-out both',
        'slide-in-right': 'slideInRight 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        'scale-in': 'scaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        shimmer: 'shimmer 1.5s infinite',
        'count-up': 'countUp 0.5s ease-out both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(28px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
