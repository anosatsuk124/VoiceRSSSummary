import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: ".", // プロジェクトルートを明示
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
