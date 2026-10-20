/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.{ts,tsx}'],
    environmentOptions: { jsdom: { url: 'http://localhost:3000/admin/login' } },
    restoreMocks: true,
  },
});
