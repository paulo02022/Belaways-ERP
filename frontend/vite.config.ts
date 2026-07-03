import react from '@vitejs/plugin-react';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

loadEnv({ path: '../.env', quiet: true });
loadEnv({ path: '.env', quiet: true });

const normalizeSupabaseUrl = (url: string) =>
  url
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${process.env.PORT ?? '3000'}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-')) return 'charts';
          if (id.includes('framer-motion') || id.includes('motion-dom')) return 'motion';
          if (id.includes('@supabase')) return 'supabase';
          return 'vendor';
        },
      },
    },
  },
  environments: {
    client: {
      build: {
        chunkSizeWarningLimit: 650,
      },
    },
  },
  define: {
    'import.meta.env.BELAWAYS_SUPABASE_URL': JSON.stringify(
      normalizeSupabaseUrl(process.env.SUPABASE_URL ?? ''),
    ),
    'import.meta.env.BELAWAYS_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.SUPABASE_ANON_KEY ?? '',
    ),
  },
});
