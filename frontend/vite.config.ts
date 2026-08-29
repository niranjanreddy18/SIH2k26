import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/cases': 'http://localhost:5000',
      '/documents': 'http://localhost:5000',
      '/evidence': 'http://localhost:5000',
      '/blockchain': 'http://localhost:5000'
    }
  }
});

