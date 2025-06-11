import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import cspPlugin from './vite-plugin-csp'
/// <reference types="vitest" />

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
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: [
        'localhost', 
        '127.0.0.1', 
        'pegi-ms-7c37',
        'pegi-ms-7c37.tail3f7380',
        '.ts.net'
      ]
    },
  }
})
