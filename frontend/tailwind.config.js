/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        'glow-pulse-green': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(16,185,129,0.4), 0 0 40px rgba(16,185,129,0.15)' },
          '50%': { boxShadow: '0 0 24px rgba(16,185,129,0.7), 0 0 60px rgba(16,185,129,0.3)' },
        },
        'glow-pulse-red': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.2)' },
          '50%': { boxShadow: '0 0 28px rgba(239,68,68,0.9), 0 0 70px rgba(239,68,68,0.4)' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-8px)' },
          '20%': { transform: 'translateX(8px)' },
          '30%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '50%': { transform: 'translateX(-4px)' },
          '60%': { transform: 'translateX(4px)' },
          '70%': { transform: 'translateX(-2px)' },
          '80%': { transform: 'translateX(2px)' },
          '100%': { transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'glow-green': 'glow-pulse-green 2s ease-in-out infinite',
        'glow-red': 'glow-pulse-red 1.5s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.4,0,0.2,1) both',
        shake: 'shake 0.5s cubic-bezier(0.36,0.07,0.19,0.97) both',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
