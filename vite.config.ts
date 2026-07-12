/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "node:path";

// VITE_SINGLE_FILE inlines everything into one HTML file (portable demo
// builds); pair it with VITE_HASH_ROUTER since such hosts lack SPA fallback.
const singleFile = !!process.env.VITE_SINGLE_FILE;

const BUILD_STAMP = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

export default defineConfig({
  // Set VITE_BASE for subpath hosting (e.g. GitHub Pages: /THE-BIG-3/).
  base: process.env.VITE_BASE ?? "/",
  // Build stamp shown in Settings — lets anyone verify which deploy a
  // device is actually running (stale-cache debugging). version.json carries
  // the same stamp so a running (possibly cache-frozen) app can detect that a
  // newer deploy exists and refresh itself — see the update check in main.tsx.
  define: {
    __BUILD_STAMP__: JSON.stringify(BUILD_STAMP),
  },
  plugins: [
    react(),
    {
      name: "emit-version-json",
      apply: "build",
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ build: BUILD_STAMP }),
        });
      },
    },
    ...(singleFile ? [viteSingleFile()] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
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
