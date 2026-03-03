import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // built-in Node module, no install needed

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ← this fixes all @/ imports
    },
  },
  server: {
    port: 8080, // force your preferred port (optional)
  },
})