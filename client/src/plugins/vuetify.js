import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        colors: {
          primary: '#ff5722',        // Deep Orange - Main accent
          secondary: '#00adb5',      // Teal - Secondary accent
          background: '#222831',     // Dark Gray - Background
          surface: '#2d3e50',        // Slightly lighter for cards
          error: '#ff6b6b',
          warning: '#ffd93d',
          info: '#6bcf7f',
          success: '#4CAF50',
        },
      },
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})
