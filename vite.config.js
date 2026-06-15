import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// the dashboard is served by the local server in production; in dev, vite serves
// the UI and proxies the API + event stream to the server on port 4317.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4317', changeOrigin: true },
    },
  },
});
