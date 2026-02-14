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
          // 150: '#f9f9f9',
          // 350: '#B4B4B4',
          // 750: '#303030',
          // 850: '#212121',
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
          // 75: '#f7f6f3',
          // 100: '#f5f3f0',   // muy claro, toque cálido
          // 150: '#f7f6f3',   // En realidad deberÍa ser 75. Hay que modificar el html
          // 200: '#e8e3dd',   // gris claro + warm
          // 300: '#ddd3ca',   // toque más naranja
          // 350: '#C9BDB2',   // Warm-Grey - toque naranga
          // 400: '#b5a89a',   // warm-grey
          // 500: '#8b7d6f',   // mid-tone con verde sutil
          // 600: '#6b5f52',   // marrón-verde oscuro
          // 700: '#524a42',   // Gris tierra con un matiz verdoso/musgo
          // 750: '#433B32',   // Magia desde Gemini
          // 800: '#3a3228',   // Marrón profundo y cálido
          // 850: '#352D23',   // Magia Gemini 
          // 900: '#2a231a',   // muy oscuro, marronáceo
          // 950: '#12100c',    // casi negro con warmth
          50:  '#fbfaf8',
          75: '#f8f7f4',
          100: '#f6f4f1',
          150: '#f8f7f4',   // En realidad deberÍa ser 75. Hay que modificar el html
          200: '#e8e4dd',
          300: '#d6d1c7',
          350: '#BEB8AC',
          400: '#a79f91',
          500: '#7b7367',
          600: '#5f584f',
          700: '#454039',
          750: '#34302A',  // Magia Gemini
          800: '#2a2621',
          850: '#25211D',   // Magia Gemini 
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
