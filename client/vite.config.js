import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

// In Docker, Caddy handles all routing - no proxy needed
// Outside Docker (local dev without Docker), proxy to localhost:5000
const isDocker = process.env.DOCKER_ENV === 'true';

export default defineConfig({
  build: {
    outDir: 'build',
  },
  plugins: [react(), eslint()],
  server: {
    host: true,
    port: 5173,
    // Only use proxy when NOT in Docker (Caddy handles routing in Docker)
    proxy: isDocker ? undefined : {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/temp': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});