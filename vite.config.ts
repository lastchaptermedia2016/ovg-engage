import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8080,
  },
  // --- NUWE BYVOEGING VIR DIE WIDGET ---
  build: {
    lib: {
      // Dit wys na die loader.js wat jy nou net geskep het
      entry: path.resolve(__dirname, 'src/loader.js'), 
      name: 'LuxeWidget',
      fileName: (format) => `widget.js`, // Dit gaan altyd widget.js genoem word
      formats: ['iife'], // 'iife' is nodig vir direkte <script> tags op webtuistes
    },
    rollupOptions: {
      // Ons sorg dat React nie "external" is nie, sodat dit binne-in die widget saamgebundel word
      output: {
        extend: true,
      },
    },
  },
})
