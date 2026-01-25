/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  darkMode: 'selector', // Activa el modo oscuro cuando la clase 'dark' está presente
  theme: {
    extend: {
      colors: {
        neutral: {
          150: '#f9f9f9',
          350: '#B4B4B4',
          750: '#303030',
          850: '#212121',
          // 50: '#f8f8f6', // Un blanco roto con una pizca de hueso
          // 100: '#f1f1eb', // Tono crema muy claro
          // 200: '#e2e2d5', // Gris cálido con presencia de verde sutil
          // 300: '#c9c9b9', // Tono medio desaturado
          // 400: '#a3a393', // Gris piedra
          // 500: '#7d7d6f', // Balance perfecto entre gris y oliva
          // 600: '#616155', // Tono de sombra medio
          // 700: '#4a4a41', // El tono "Claude" para textos secundarios en Dark Mode
          // 800: '#32322d', // Fondo de tarjetas o superficies
          // 900: '#1e1e1b', // Fondo principal (Deep Stone)
          // 950: '#121210', // El negro casi marrón/verde para el fondo total
          // 50: '#faf9f7',    // blanco con warmth
          // 100: '#f5f3f0',   // muy claro, toque cálido
          // 200: '#e8e3dd',   // gris claro + warm
          // 300: '#ddd3ca',   // toque más naranja
          // 400: '#b5a89a',   // warm-grey
          // 500: '#8b7d6f',   // mid-tone con verde sutil
          // 600: '#6b5f52',   // marrón-verde oscuro
          // 700: '#524a42',   // más oscuro, verde presente
          // 800: '#3a3228',   // oscuro cálido
          // 900: '#2a231a',   // muy oscuro, marronáceo
          // 950: '#12100c',    // casi negro con warmth
          // 50:  '#fafaf9',
          // 100: '#f5f5f4',
          // 200: '#e6e5e3',
          // 300: '#d4d3cf',
          // 400: '#a6a39a',
          // 500: '#7a776e',
          // 600: '#5f5c54',
          // 700: '#45433c',
          // 800: '#2a2924',
          // 900: '#1b1a16',
          // 950: '#0f0e0b',
          // 50:  '#f9faf8',
          // 100: '#f3f5f2',
          // 200: '#e2e6e0',
          // 300: '#cfd4cd',
          // 400: '#9ea49a',
          // 500: '#71776e',
          // 600: '#575c54',
          // 700: '#3f443d',
          // 800: '#262a25',
          // 900: '#181b17',
          // 950: '#0c0e0b',
          50:  '#fbfaf8',
          100: '#f6f4f1',
          200: '#e8e4dd',
          300: '#d6d1c7',
          400: '#a79f91',
          500: '#7b7367',
          600: '#5f584f',
          700: '#454039',
          800: '#2a2621',
          900: '#1b1814',
          950: '#0f0d0a',
        },
      },
      screens: {
        'xs': '460px',
      },
    },
  },
  plugins: [],
}
