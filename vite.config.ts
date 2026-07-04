import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'estrella-circle.png', 'og-image.jpg'],
      manifest: {
        name: 'Estrella Eats',
        short_name: 'Estrella',
        description: 'Pide de tus restaurantes favoritos en Comitán y recibe tu comida calientita hasta la puerta de tu casa.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'estrella-circle.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'estrella-circle.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'estrella-circle.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
