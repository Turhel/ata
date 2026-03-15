import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/health": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/me": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/users": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/orders": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/pool-import": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/clients": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/work-types": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/inspectors": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/inspector-accounts": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/dashboard": {
        target: "http://localhost:3001",
        changeOrigin: true
      }
    }
  }
});
