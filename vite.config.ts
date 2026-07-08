import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    // Local stand-in for the Vercel functions: run `npx tsx scripts/dev-api.mjs`
    // alongside `vite dev` and /api/* is served by the real handlers.
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          firebase: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
          ],
        },
      },
    },
  },
});
