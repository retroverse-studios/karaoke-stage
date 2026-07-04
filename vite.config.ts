import path from 'path';
import { defineConfig, configDefaults } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // 'unsafe-inline' is required for React inline style props
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "connect-src 'self'",
].join('; ');

// Build-only: the dev server needs inline scripts for HMR, which this CSP forbids
function injectCsp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml: () => [{
      tag: 'meta',
      attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
      injectTo: 'head-prepend',
    }],
  };
}

export default defineConfig({
  // Relative asset paths so the same build works at site root (Docker/nginx)
  // and under a subpath (GitHub Pages /karaoke-stage/app/)
  base: './',
  server: {
    port: 3000,
  },
  plugins: [react(), tailwindcss(), injectCsp()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  test: {
    // exFAT/AppleDouble junk files (._foo.test.ts) match the default glob
    exclude: [...configDefaults.exclude, '**/._*'],
  },
});
