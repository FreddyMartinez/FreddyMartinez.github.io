import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// User page repo (<user>.github.io) is served from the root, so base stays '/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
  // three.js is big; it lives in its own lazy-loaded chunk, so this is expected.
  build: { chunkSizeWarningLimit: 1000 },
})
