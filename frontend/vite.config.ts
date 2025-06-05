import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import cspPlugin from './vite-plugin-csp'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Parse the API URL to get the origin
  const apiUrl = new URL(env.VITE_API_URL || 'http://localhost:3000/api')
  const apiOrigin = apiUrl.origin

  return {
    plugins: [
      react(), 
      tailwindcss(),
      cspPlugin()
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Expose env variables to your app
    define: {
      'process.env': env
    },
    server: {
      headers: {
        // Content Security Policy
        'Content-Security-Policy': `
          default-src 'self';
          script-src 'self' 'unsafe-inline' 'unsafe-eval';
          style-src 'self' 'unsafe-inline';
          img-src 'self' data: https:;
          font-src 'self';
          connect-src 'self' ${apiOrigin} ws://localhost:* wss://localhost:*;
          frame-src 'none';
          object-src 'none';
          base-uri 'self';
          form-action 'self';
          frame-ancestors 'none';
          upgrade-insecure-requests;
        `.replace(/\s+/g, ' ').trim(),
        // Other security headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  }
})
