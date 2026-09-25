/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nexus: {
          dark: '#0a0e17',
          card: '#111827',
          cardHover: '#161f33',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#10b981', // Emerald green
          cyan: '#06b6d4',
          shuffler: '#6366f1', // Indigo for Shuffler
          pizzahut: '#f59e0b', // Amber for Pizza Hut
          debt: '#f43f5e',
          betting: '#ec4899',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(16, 185, 129, 0.15)',
        'glow-lg': '0 0 30px -5px rgba(6, 182, 212, 0.2)',
        'glow-indigo': '0 0 20px -3px rgba(99, 102, 241, 0.2)',
      }
    },
  },
  plugins: [],
}
