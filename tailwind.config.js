// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ruggable: {
          primary: '#657567',
          cta: '#934b32',
          'cta-hover': '#833f2a',
          'primary-light': '#7a8a7a',
          'primary-dark': '#4d594d',
        },
      },
      fontFamily: {
        lora: ['Lora', ...defaultTheme.fontFamily.serif],
        manrope: ['Manrope', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography') // Add this line
  ],
}
