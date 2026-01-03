import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["IansLogo.png"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB limit
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: "Ian's Laundry Hub",
        short_name: "Ian's Laundry",
        description: "Point of Sale for Ian's Laundry Hub",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#375da5",
        icons: [
          {
            src: "/IansLogo.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/IansLogo.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
