/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#137fec',
        'bg-light': '#f6f7f8',
        'bg-dark': '#101922',
        'text-main': '#0f172a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        button: '8px',
      },
    },
  },
  plugins: [],
};

