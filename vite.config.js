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
      // Allow serving files from Freddy.Plugins repo for local dev
      allow: [
        "/Users/philliploacker/Documents/GitHub/MyCar integration",
        "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins",
      ],
    },
    proxy: {
      "/mycarl": {
        target: "http://localhost:3100",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mycarl/, ""),
      },
    },
  },
  root: ".",
  resolve: {
    alias: {
      "@": "/src",
      // Map Freddy plugins to local dist output
      "@aitronos/freddy-plugins":
        "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins/dist/index.js",
      "@aitronos/freddy-plugins/web-components":
        "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins/dist/web-components.js",
      "@aitronos/freddy-plugins/freddy-plugins.css":
        "/Users/philliploacker/Documents/GitHub/Aitronos.Freddy.Plugins/dist/freddy-plugins.css",
    },
  },
});
