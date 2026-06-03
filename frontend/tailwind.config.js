/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      colors: {
        ember: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
        flame: {
          500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
        ink: {
          900: '#0b0f17', 800: '#121826', 700: '#1b2333', 600: '#273043',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(249,115,22,.25), 0 12px 40px -12px rgba(249,115,22,.45)',
        card: '0 10px 30px -15px rgba(0,0,0,.35)',
      },
      keyframes: {
        flicker: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '.85', transform: 'scale(1.04)' },
        },
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        fadeup: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        flicker: 'flicker 2.6s ease-in-out infinite',
        floaty: 'floaty 5s ease-in-out infinite',
        fadeup: 'fadeup .5s ease both',
      },
    },
  },
  plugins: [],
};
