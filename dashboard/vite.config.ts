import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // SSE streams need special handling - no buffering
      "/api/stream": {
        target: "http://localhost:3100",
        changeOrigin: true,
        // Critical for SSE: configure proxy to not buffer
        configure: (proxy) => {
          // Disable buffering for SSE
          proxy.on("proxyReq", (_proxyReq, _req, res) => {
            // Set headers to prevent any caching/buffering
            res.setHeader("X-Accel-Buffering", "no");
          });
          proxy.on("proxyRes", (proxyRes, _req, res) => {
            // Ensure SSE headers are preserved
            if (
              proxyRes.headers["content-type"]?.includes("text/event-stream")
            ) {
              res.setHeader("Content-Type", "text/event-stream");
              res.setHeader("Cache-Control", "no-cache");
              res.setHeader("Connection", "keep-alive");
            }
          });
        },
      },
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true,
      },
    },
  },
});
