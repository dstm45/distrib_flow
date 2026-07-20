import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/admin': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/franchises': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/my-franchises': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/produits': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/ventes': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
      '/vendeurs': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
})
