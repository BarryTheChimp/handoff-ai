/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        toucan: {
          // Primary
          orange: '#FF6B35',
          'orange-light': '#FF8F66',
          'orange-dark': '#E55A2B',
          // Backgrounds
          dark: '#1A1A2E',
          'dark-lighter': '#252542',
          'dark-border': '#3D3D5C',
          // Text (using grey prefix as per CLAUDE.md)
          'grey-100': '#F5F5F7',
          'grey-200': '#E5E5E7',
          'grey-400': '#9999A5',
          'grey-600': '#66667A',
          // Semantic
          success: '#4ADE80',
          warning: '#FBBF24',
          error: '#F87171',
          info: '#60A5FA',
          // Status
          'status-draft': '#6B7280',
          'status-review': '#F59E0B',
          'status-approved': '#10B981',
          'status-exported': '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      borderRadius: {
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in-out',
        'slide-in': 'slideIn 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
