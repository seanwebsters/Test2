import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5174 },
  preview: { host: true, port: 4174 },
  build: { target: 'es2022', chunkSizeWarningLimit: 2000 },
});
