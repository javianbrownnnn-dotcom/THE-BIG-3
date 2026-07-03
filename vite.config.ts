import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// VITE_SINGLE_FILE inlines everything into one HTML file (portable demo
// builds); pair it with VITE_HASH_ROUTER since such hosts lack SPA fallback.
const singleFile = !!process.env.VITE_SINGLE_FILE;

export default defineConfig({
  // Set VITE_BASE for subpath hosting (e.g. GitHub Pages: /THE-BIG-3/).
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), ...(singleFile ? [viteSingleFile()] : [])],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: singleFile
        ? {}
        : {
            manualChunks: {
              react: ["react", "react-dom", "react-router-dom"],
              charts: ["recharts"],
              supabase: ["@supabase/supabase-js"],
            },
          },
    },
  },
});
