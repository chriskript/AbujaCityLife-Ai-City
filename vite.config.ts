import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

export default defineConfig({
  root: 'client',
  envDir: false,
  publicDir: false,
  plugins: [{
    name: 'third-party-notices',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.txt', source: readFileSync(resolve('THIRD_PARTY_NOTICES.txt'), 'utf8') });
    },
  }],
  server: {
    proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } },
    host: '127.0.0.1', port: 5173, strictPort: true,
    fs: {
      allow: [resolve('client'), resolve('shared'), resolve('node_modules')],
      deny: ['**/.env', '**/.env.*', '**/runtime/**', '**/server/**', '**/.git/**'],
    },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
