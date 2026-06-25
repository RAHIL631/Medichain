/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'medichain-bg-dark': '#020617',
        'medichain-bg-light': '#0F172A',
        'medichain-surface': '#1E293B',
        'medichain-surface-glass': 'rgba(30, 41, 59, 0.6)',
        'medichain-border': 'rgba(255,255,255,0.08)',
        'accent-blue': '#38BDF8',
        'accent-cyan': '#22D3EE',
        'accent-indigo': '#818CF8',
        'status-success': '#22C55E',
        'status-warning': '#F59E0B',
        'status-danger': '#EF4444',
        'text-primary': '#E2E8F0',
        'text-secondary': '#94A3B8',
      },
      fontFamily: {
        'sans': ['Inter', 'sans-serif'],
        'display': ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 3s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px 0px rgba(34, 211, 238, 0.5)' },
          '50%': { opacity: '.7', boxShadow: '0 0 5px 0px rgba(34, 211, 238, 0.2)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        }
      }
    },
  },
  plugins: [],
}
