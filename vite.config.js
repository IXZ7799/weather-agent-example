import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/llmwhisperer': {
        target: 'https://llmwhisperer-api.us-central.unstract.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llmwhisperer/, ''),
      },
    },
  },
  plugins: [
    react(),
    // componentTagger removed as it's not available
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));