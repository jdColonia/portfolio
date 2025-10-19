/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          black: '#000',
          white: '#fff',
          'green-muted': '#8ba989',
          'green-vivid': '#53FB57',
          'blue-dark-muted': '#1c222e',
          'blue-dark': '#203065',
        },
      },
      fontFamily: {
        'dm-sans': ['DM Sans', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
