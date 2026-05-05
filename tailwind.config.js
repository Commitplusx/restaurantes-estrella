/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#f97316',
          dark: '#ea6a00',
          light: '#fff7ed',
        },
        surface: {
          DEFAULT: '#1a1a1a',
          2: '#242424',
        },
        border: '#2e2e2e',
      }
    },
  },
  plugins: [],
}
