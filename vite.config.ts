import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      includeAssets: ['brand/estrella-mark-v2-192.png', 'brand/estrella-mark-v2-512.png', 'brand/estrella-mark-v2-maskable.png'],
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
            src: 'brand/estrella-mark-v2-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'brand/estrella-mark-v2-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'brand/estrella-mark-v2-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: "Pedir Comida",
            short_name: "Pedir",
            description: "Pide de tus restaurantes favoritos",
            url: "/",
            icons: [{ src: "brand/estrella-mark-v2-192.png", sizes: "192x192" }]
          }
        ],
        screenshots: [
          {
            src: "og-image.jpg",
            sizes: "1280x640",
            type: "image/jpeg",
            form_factor: "wide"
          },
          {
            src: "og-image.jpg",
            sizes: "1280x640",
            type: "image/jpeg",
            form_factor: "narrow"
          }
        ]
      },
      workbox: {
        importScripts: ['/push-sw.js'],
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
        globIgnores: ['**/login-cover.png', '**/login-cover.jpg'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ request, url, sameOrigin }) => request.destination === 'image' && (sameOrigin
              || /^https:\/\/jdrrkpvodnqoljycixbg\.supabase\.co\/storage\/v1\/(?:object|render\/image)\/public\/(?:menu-fotos|publicidad)\//.test(url.href)),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'catalog-images-v2',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // Public images only; API data is never cached here.
              },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
})
