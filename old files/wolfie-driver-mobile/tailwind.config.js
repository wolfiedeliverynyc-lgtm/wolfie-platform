/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        wolfieOrange: '#FF5A00',
        darkBg: '#0A0A0A',
        darkCard: '#151515',
        darkBorder: '#222222'
      }
    },
  },
  plugins: [],
}
