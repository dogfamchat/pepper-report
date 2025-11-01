import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://dogfamchat.github.io',
  base: '/pepper-report',
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        '@data': '/data'
      }
    }
  }
});
