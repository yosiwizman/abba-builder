import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  server: {
    port: 5174,
    strictPort: true,
    hmr: { overlay: false },
    fs: {
      strict: true,
      allow: [path.resolve(__dirname, "src"), path.resolve(__dirname, "public"), __dirname],
      deny: [
        "**/project-library-backup/**",
        "**/project-library/**",
        "**/e2e-tests/**",
        "**/node_modules/@types/**",
      ],
    },
  },
  optimizeDeps: {
    entries: ["index.html", "src/renderer.tsx"],
    include: [
      "react",
      "react-dom",
      "@tanstack/react-router",
      "@tanstack/react-query",
      "lucide-react",
    ],
    exclude: [
      "@electron/remote",
      "puppeteer",
      "lighthouse",
      "project-library-backup",
    ],
  },
});
