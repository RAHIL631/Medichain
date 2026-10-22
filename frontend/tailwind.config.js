/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'medichain-bg-ivory':      '#FAF8F1',
        'medichain-bg-mint':       '#E9F4EC',
        'medichain-surface':       '#FFFFFF',
        'medichain-surface-soft':  'rgba(255,255,255,0.94)',
        'medichain-border':        '#E4E9E2',
        'accent-emerald':          '#16866A',
        'accent-emerald-dark':     '#0F6852',
        'accent-terracotta':       '#D97860',
        'status-success':          '#16866A',
        'status-warning':          '#805B12',
        'status-danger':           '#B44736',
        'text-primary':            '#26352E',
        'text-secondary':          '#68766E',

        'hc-bg':           '#FAF8F1',
        'hc-bg-alt':       '#E9F4EC',
        'hc-surface':      '#FFFFFF',
        'hc-surface-alt':  '#FAF8F1',
        'hc-emerald':      '#0F6852',
        'hc-emerald-hover':'#174A3A',
        'hc-emerald-soft': '#E9F4EC',
        'hc-emerald-mid':  '#B9D8C5',
        'hc-emerald-dark': '#0F6852',
        'hc-emerald-dark-soft': '#E9F4EC',
        'hc-emerald-dark-hover': '#174A3A',
        'hc-terracotta':   '#B44736',
        'hc-terracotta-soft': '#F8E5DD',
        'hc-success':      '#0F6852',
        'hc-success-soft': '#E9F4EC',
        'hc-warning':      '#805B12',
        'hc-warning-soft': '#FBF3DE',
        'hc-danger':       '#B44736',
        'hc-danger-soft':  '#F8E5DD',
        'hc-info':         '#0F6852',
        'hc-info-soft':    '#E9F4EC',
        'hc-text':         '#26352E',
        'hc-text-muted':   '#68766E',
        'hc-text-light':   '#68766E',
        'hc-border':       '#E4E9E2',
        'hc-border-light': '#E4E9E2',
        'hc-forest':       '#174A3A',

        emerald: {
          50: '#E9F4EC', 100: '#E9F4EC', 200: '#B9D8C5', 300: '#B9D8C5',
          400: '#0F6852', 500: '#0F6852', 600: '#0F6852', 700: '#0F6852',
          800: '#174A3A', 900: '#174A3A', 950: '#174A3A',
        },
        green: {
          50: '#E9F4EC', 100: '#E9F4EC', 200: '#B9D8C5', 300: '#B9D8C5',
          400: '#0F6852', 500: '#0F6852', 600: '#0F6852', 700: '#174A3A',
          800: '#174A3A', 900: '#174A3A', 950: '#174A3A',
        },
        orange: {
          50: '#F8E5DD', 100: '#F8E5DD', 200: '#F8E5DD', 300: '#D97860',
          400: '#B44736', 500: '#B44736', 600: '#B44736', 700: '#8D3A2D',
          800: '#8D3A2D', 900: '#8D3A2D', 950: '#8D3A2D',
        },
        amber: {
          50: '#FBF3DE', 100: '#FBF3DE', 200: '#EBCB82', 300: '#EBCB82',
          400: '#EBCB82', 500: '#805B12', 600: '#805B12', 700: '#805B12',
          800: '#805B12', 900: '#805B12', 950: '#805B12',
        },
        yellow: {
          50: '#FBF3DE', 100: '#FBF3DE', 200: '#EBCB82', 300: '#EBCB82',
          400: '#EBCB82', 500: '#805B12', 600: '#805B12', 700: '#805B12',
          800: '#805B12', 900: '#805B12', 950: '#805B12',
        },
        red: {
          50: '#F8E5DD', 100: '#F8E5DD', 200: '#F8E5DD', 300: '#D97860',
          400: '#D97860', 500: '#B44736', 600: '#B44736', 700: '#8D3A2D',
          800: '#8D3A2D', 900: '#8D3A2D', 950: '#8D3A2D',
        },
      },

      fontFamily: {
        'inter':   ['Inter', 'system-ui', 'sans-serif'],
        'jakarta': ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        'sans':    ['Inter', 'system-ui', 'sans-serif'],
        'display': ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },

      boxShadow: {
        'hc-card':    '0 2px 8px rgba(38,53,46,0.05), 0 1px 2px rgba(38,53,46,0.03)',
        'hc-card-md': '0 8px 24px rgba(38,53,46,0.07)',
        'hc-card-lg': '0 16px 40px rgba(38,53,46,0.09)',
        'hc-inset':   'inset 0 2px 4px rgba(38,53,46,0.04)',
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
          '0%, 100%': { opacity: '1', boxShadow: '0 0 12px 0px rgba(22, 134, 106, 0.25)' },
          '50%':       { opacity: '.7', boxShadow: '0 0 4px 0px rgba(22, 134, 106, 0.12)' },
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
