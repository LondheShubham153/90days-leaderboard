import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, forward /api to a locally running backend (`STORE=memory npm run dev` in ../backend).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:9000' } },
  test: { environment: 'jsdom', setupFiles: './src/setup.js', globals: true },
});
