// Vite configuration file for the React application
// Configures the development server, build settings, and plugin integrations
// Sets up proxy servers for backend API and stock API services

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Export the Vite configuration
export default defineConfig(({ mode }) => ({
  // Development server configuration
  server: {
    host: "::",
    port: 5173,
    // Proxy configuration for API endpoints
    proxy: {
      // Proxy for main backend API
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy for authentication endpoints
      '/auth': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy for static files (e.g. avatars)
      '/static': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy for stock market API
      '/stock-api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/stock-api/, '')
      }
    }
  },
  // Plugin configuration
  plugins: [
    react(),
    // Only enable component tagger in development mode
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  // Path resolution configuration
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));