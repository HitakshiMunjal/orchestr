import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Port 5173/5000 are used by another local project, so Orchestrr runs on 5174 -> API 5050
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5050",
        changeOrigin: true,
      },
    },
  },
});
