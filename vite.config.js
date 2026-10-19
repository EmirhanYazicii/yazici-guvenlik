import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// package.json "type": "module" — __dirname yoktur, ESM'de türetilmeli
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: {
    alias: {
      // @shared/requestSchema.js → shared/requestSchema.js (proje kökü)
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true, // root dışındaki outDir temizlenmez; bu flag gerekli
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
});
