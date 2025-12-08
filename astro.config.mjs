import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  site: 'https://pepper-report.pages.dev',
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@data': '/data',
      },
    },
  },
});
