import { defineConfig } from 'vite';

// base './' => GitHub Pages / herhangi bir statik hosting alt klasöründe çalışır
export default defineConfig({
  base: './',
  server: { port: 5173, open: false },
  build: { chunkSizeWarningLimit: 900 }
});
