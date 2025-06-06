import type { Plugin } from 'vite'

export default function cspPlugin(): Plugin {
  return {
    name: 'vite-plugin-csp',
    transformIndexHtml(html) {
      // Get the API URL from environment variables
      const apiUrl = process.env.VITE_API_URL || 'http://localhost:3000/api'
      const apiOrigin = new URL(apiUrl).origin

      // Replace the placeholder with the actual API origin
      return html.replace('__API_ORIGIN__', apiOrigin)
    },
  }
} 