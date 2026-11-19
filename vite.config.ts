import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalized = id.replace(/\\/g, '/');
            if (normalized.includes('/node_modules/')) {
              if (normalized.includes('/node_modules/pdfjs-dist/')) return 'vendor-pdf';
              if (normalized.includes('/node_modules/clsx/') || normalized.includes('/node_modules/tailwind-merge/')) return 'vendor-react';
              if (normalized.includes('/node_modules/recharts/') || normalized.includes('/node_modules/d3-') || normalized.includes('/node_modules/victory-vendor/')) return 'vendor-charts';
              if (normalized.includes('/node_modules/@firebase/auth/') || normalized.includes('/node_modules/firebase/auth/')) return 'vendor-firebase-auth';
              if (normalized.includes('/node_modules/@firebase/firestore/') || normalized.includes('/node_modules/firebase/firestore/')) return 'vendor-firebase-firestore';
              if (normalized.includes('/node_modules/@firebase/') || normalized.includes('/node_modules/firebase/')) return 'vendor-firebase-core';
              if (normalized.includes('/node_modules/motion/') || normalized.includes('/node_modules/framer-motion/') || normalized.includes('/node_modules/motion-dom/') || normalized.includes('/node_modules/motion-utils/')) return 'vendor-motion';
              if (normalized.includes('/node_modules/lucide-react/')) return 'vendor-icons';
              if (normalized.includes('/node_modules/react-dom/') || normalized.includes('/node_modules/react-router') || normalized.includes('/node_modules/react/') || normalized.includes('/node_modules/scheduler/')) return 'vendor-react';
            }
          },
        },
      },
    },
  };
});
