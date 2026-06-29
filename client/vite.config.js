import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['nxtbiz-client-production.up.railway.app'],
    host: true,
    port: 8080
  }
})