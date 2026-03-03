import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          primary: 'hsl(45 100% 70%)',     // #FFD700
          dark: 'hsl(45 80% 55%)',         // #D4AF37
        },
      },
      boxShadow: {
        'gold-dark': '0 10px 15px -3px hsla(45, 80%, 55%, 0.3)',
        'gold-primary': '0 10px 15px -3px hsla(45, 100%, 70%, 0.5)',
      },
    },
  },
  plugins: [],
} satisfies Config
