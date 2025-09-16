import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Treat freddy-* tags as custom elements
          isCustomElement: (tag) => tag.startsWith("freddy-"),
        },
      },
    }),
  ],
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    host: "localhost",
    fs: {
      // Allow serving files from project directory
      allow: [
        "/Users/philliploacker/Documents/GitHub/MyCar integration",
      ],
    },
    proxy: {
      "/mycarl": {
        target: "http://localhost:3100",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mycarl/, ""),
      },
      "/freddy-api": {
        target: "https://freddy-api.aitronos.com",
        changeOrigin: true,
        secure: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Freddy API proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying Freddy API request:', req.method, req.url);
          });
        },
        rewrite: (path) => path.replace(/^\/freddy-api/, ""),
      },
    },
  },
  root: ".",
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
