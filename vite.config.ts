import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    root: '.', // Explicitly tell Vite the root is here, not in src/
    build: {
      outDir: 'dist',
    },
    define: {
      'process.env': env
    }
  };
});
