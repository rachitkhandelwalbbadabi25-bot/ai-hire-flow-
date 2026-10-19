import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('pdfjs-dist')) return 'vendor-pdf';
              if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('/react/')) return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
