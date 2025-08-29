import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Ignore custom schemes like gdide:// so Vite doesn't try to resolve them
function ignoreCustomSchemes() {
  return {
    name: 'ignore-custom-schemes',
    resolveId(source) {
      if (typeof source === 'string' && source.startsWith('gdide://')) {
        return { id: source, external: true };
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [react(), ignoreCustomSchemes()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false
    },
    fs: {
      strict: true,
      allow: [
        path.resolve(__dirname, 'src'),
        path.resolve(__dirname, 'public'),
        __dirname
      ],
      deny: [
        '**/project-library-backup/**',
        '**/project-library/**',
        '**/e2e-tests/**',
        '**/node_modules/@types/**'
      ]
    }
  },
  optimizeDeps: {
    entries: [
      'index.html',
      'src/renderer.tsx'
    ],
    include: [
      'react',
      'react-dom',
      '@tanstack/react-router',
      '@tanstack/react-query',
      'lucide-react'
    ],
    exclude: [
      'project-library-backup',
      '@electron/remote',
      'puppeteer',
      'lighthouse'
    ]
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['@tanstack/react-router', '@tanstack/react-query'],
          'ui-vendor': ['lucide-react', '@radix-ui/react-slot']
        }
      }
    }
  }
});
