import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    watch: {
      // Polling para que hot-reload funcione adentro de Docker en macOS.
      usePolling: true,
      interval: 500,
    },
  },
});
