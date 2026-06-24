import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brownish earth tones
        'earth': {
          50: '#faf8f5',
          100: '#f0ebe3',
          200: '#e4d9c8',
          300: '#d4c1a5',
          400: '#c4a882',
          500: '#b08d65',
          600: '#9d7a56',
          700: '#836349',
          800: '#6b5140',
          900: '#584437',
        },
        'clay': {
          50: '#faf7f4',
          100: '#f2e9e1',
          200: '#e6d4c4',
          300: '#d5b9a0',
          400: '#c49d7b',
          500: '#b5825d',
          600: '#a66f51',
          700: '#8b5c45',
          800: '#714c3b',
          900: '#5e4031',
        },
        'sand': {
          50: '#fdfbf7',
          100: '#f9f4eb',
          200: '#f3e8d5',
          300: '#e9d6b8',
          400: '#dcc297',
          500: '#cead7a',
          600: '#b89560',
          700: '#9a7b50',
          800: '#7d6444',
          900: '#665339',
        },
        'ink': {
          50: '#f6f5f4',
          100: '#e7e5e4',
          200: '#d1cdc9',
          300: '#b3ada7',
          400: '#948d85',
          500: '#7c756d',
          600: '#635e58',
          700: '#524e49',
          800: '#46433f',
          900: '#3d3b37',
        },
      },
      fontFamily: {
        'serif': ['Merriweather', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Playfair Display', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'watercolor-texture': "url('/textures/watercolor-bg.png')",
        'paper-texture': "url('/textures/paper-texture.png')",
      },
      boxShadow: {
        'watercolor': '0 4px 20px rgba(176, 141, 101, 0.15)',
        'paper': '0 2px 10px rgba(0, 0, 0, 0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'blob': 'blob 7s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        blob: {
          '0%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' },
          '100%': { transform: 'translate(0px, 0px) scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
