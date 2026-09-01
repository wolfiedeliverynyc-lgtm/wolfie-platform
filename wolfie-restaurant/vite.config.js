import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Wolfie Restaurant Dashboard',
        short_name: 'Wolfie Restaurant',
        description: 'Wolfie Restaurant App',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/mapbox-gl') || id.includes('node_modules/react-map-gl')) return 'mapbox';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/heic2any')) return 'heic';
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router-dom') || id.includes('node_modules/zustand') || id.includes('node_modules/framer-motion')) return 'vendor';
        }
      }
    }
  },
  server: {
    port: 5176,
    host: '127.0.0.1',
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
})

