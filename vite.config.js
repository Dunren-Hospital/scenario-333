
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  base: '/scenario-333/',
  build: { outDir: 'dist', emptyOutDir: true }
})
