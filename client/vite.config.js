import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import eslint from 'vite-plugin-eslint';

export default defineConfig({
  build: {
    outDir: 'build',
  },
  plugins: [react(), eslint()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      // This forwards requests from `/api` to your backend
      '/api': {
        target: 'http://localhost:5000', // Your backend server
        changeOrigin: true,
      },
      // Add this for temp file downloads
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