import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: '.', // プロジェクトルートを明示
  plugins: [react()],
  server: {
    port: 3000,
    optimizeDeps: {
      include: ["react/jsx-runtime"], // JSXランタイムを明示的に解決
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
    },
    // モジュール解決を明示
    commonjsOptions: {
      include: [],
    },
  },
});
