import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app works from any host or sub-path
  // (GitHub Pages project sites, Netlify, Vercel, a folder on a shared host...).
  base: './',
  server: {
    host: true,
    // Telegram can only open the Mini App over HTTPS, so during development the
    // dev server is exposed through a tunnel (ngrok / cloudflared). Those tunnels
    // use their own hostname, which Vite blocks unless it is allowed here.
    allowedHosts: true,
  },
})
