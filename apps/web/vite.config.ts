import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // es2022 supporte le top-level await (utilisé dans main.ts) ; cible navigateurs modernes.
  build: {
    target: 'es2022',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
