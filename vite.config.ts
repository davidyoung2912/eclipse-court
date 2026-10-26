import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Eclipse Court',
        short_name: 'Eclipse Court',
        description: 'A two-sided fantasy chess game settled by real-time duels.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#14102b',
        theme_color: '#14102b',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
