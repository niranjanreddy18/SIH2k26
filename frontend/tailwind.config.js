/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        police: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          500: '#102a43',
          700: '#0b1b2b',
          900: '#060e18'
        }
      }
    },
  },
  plugins: [],
}

