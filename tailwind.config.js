/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // 1️⃣ EL LIENZO (Backgrounds - Velvet)
        background: '#1E1E2E',  // Deep Dream - Violeta-gris mate
        surface: '#313244',     // Soft Layer - Grafito suave para cards

        // 2️⃣ LA ENERGÍA (Pastel Dopamine)
        primary: {
          DEFAULT: '#CBA6F7', // Lavender Haze - Creatividad, calma, magia
          dim: '#8966C2',     
          light: '#DFC0FF',
          content: '#1E1E2E'  
        },

        // STATUS COLORS
        success: {
          DEFAULT: '#A6E3A1', // Matcha Latte - Crecimiento orgánico
        },
        danger: '#F38BA8',    // Soft Coral - Corrige sin regañar
        warning: '#F9E2AF',   // Cream Yellow
        accent: '#FAB387',    // Peach Fuzz - Calidez, cercanía

        // 4️⃣ TEXTO (Lectura Cómoda)
        text: {
          primary: '#CDD6F4',   // Cloud White - Blanco hueso/nube
          secondary: '#A6ADC8', // Mist Grey - Gris niebla
          muted: '#6C7086',     // Overlay Grey
        }
      },
      // 💡 Bordes Redondeados Exagerados para "squishy" feel
      borderRadius: {
        '3xl': '1.5rem',  // 24px
        '4xl': '2rem',    // 32px
        '5xl': '2.5rem',  // 40px
        '6xl': '3rem',    // 48px
      },
    },
  },
  plugins: [],
}

