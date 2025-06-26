/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        // MTG color identity colors
        'mana-white': '#fffbd5',
        'mana-blue': '#0e68ab',
        'mana-black': '#150b00',
        'mana-red': '#d3202a',
        'mana-green': '#00733e',
        'mana-colorless': '#ccc2c0',
        'mana-multicolor': '#f8d319',
      },
      spacing: {
        'card-sm': '2.5rem',
        'card-md': '3.5rem',
        'card-lg': '5rem',
      },
      aspectRatio: {
        'card': '63 / 88', // Standard MTG card ratio
      }
    },
  },
  plugins: [],
}