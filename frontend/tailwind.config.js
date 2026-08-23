/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Legacy dark/neon colors (preserved for backward compat) ──────────
        'medichain-bg-dark':       '#020617',
        'medichain-bg-light':      '#0F172A',
        'medichain-surface':       '#1E293B',
        'medichain-surface-glass': 'rgba(30, 41, 59, 0.6)',
        'medichain-border':        'rgba(255,255,255,0.08)',
        'accent-blue':             '#38BDF8',
        'accent-cyan':             '#22D3EE',
        'accent-indigo':           '#818CF8',
        'status-success':          '#22C55E',
        'status-warning':          '#F59E0B',
        'status-danger':           '#EF4444',
        'text-primary':            '#E2E8F0',
        'text-secondary':          '#94A3B8',

        // ── NEW Healthcare Design System ─────────────────────────────────────
        'hc-bg':           '#F7FAFC',
        'hc-bg-alt':       '#F0F4F8',
        'hc-surface':      '#FFFFFF',
        'hc-surface-alt':  '#F7FAFC',
        'hc-blue':         '#087EA4',
        'hc-blue-hover':   '#066a8c',
        'hc-blue-soft':    '#E7F5FA',
        'hc-blue-mid':     '#B3DFF0',
        'hc-teal':         '#0F9D8A',
        'hc-teal-soft':    '#DDF7F1',
        'hc-teal-hover':   '#0c8476',
        'hc-violet':       '#6D5CE7',
        'hc-violet-soft':  '#EEEAFE',
        'hc-success':      '#168A68',
        'hc-success-soft': '#D4F5EB',
        'hc-warning':      '#C77900',
        'hc-warning-soft': '#FEF3C7',
        'hc-danger':       '#C94B4B',
        'hc-danger-soft':  '#FEE8E8',
        'hc-info':         '#1D6FA4',
        'hc-info-soft':    '#DBEAFE',
        'hc-text':         '#102A43',
        'hc-text-muted':   '#52667A',
        'hc-text-light':   '#8FA3B1',
        'hc-border':       '#D9E2EC',
        'hc-border-light': '#EEF2F7',
        'hc-navy':         '#0D1F2D',
        'hc-navy-2':       '#152534',
      },

      fontFamily: {
        'inter':   ['Inter', 'system-ui', 'sans-serif'],
        'jakarta': ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        'sans':    ['Inter', 'system-ui', 'sans-serif'],
        'display': ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },

      boxShadow: {
        'hc-card':    '0 2px 8px rgba(16,42,67,0.06), 0 1px 2px rgba(16,42,67,0.04)',
        'hc-card-md': '0 8px 30px rgba(16,42,67,0.08)',
        'hc-card-lg': '0 16px 48px rgba(16,42,67,0.10)',
        'hc-inset':   'inset 0 2px 4px rgba(16,42,67,0.04)',
      },

      animation: {
        'glow-pulse':  'glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline':    'scanline 3s linear infinite',
        'shimmer':     'shimmer 1.8s infinite',
        'fade-in':     'fadeIn 0.2s ease-out',
        'slide-up':    'slideUp 0.25s ease-out',
        'slide-down':  'slideDown 0.25s ease-out',
        'toast-in':    'toastIn 0.3s ease-out',
      },

      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px 0px rgba(34, 211, 238, 0.5)' },
          '50%':       { opacity: '.7', boxShadow: '0 0 5px 0px rgba(34, 211, 238, 0.2)' },
        },
        'scanline': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'fadeIn':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'slideUp':   { '0%': { opacity: '0', transform: 'translateY(8px)' },  '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slideDown': { '0%': { opacity: '0', transform: 'translateY(-8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'toastIn':   { '0%': { opacity: '0', transform: 'translateX(100%)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};
