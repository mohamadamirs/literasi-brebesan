import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import path from 'path';

export default defineConfig({
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'astro:actions': path.resolve(__dirname, './src/test-mocks/astro.ts'),
      'astro:schema': path.resolve(__dirname, './src/test-mocks/astro.ts')
    }
  }
});
