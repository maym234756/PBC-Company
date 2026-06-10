import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router")) {
              return "router-vendor";
            }

            if (id.includes("react-dom") || id.includes("/react/") || id.includes("react/jsx-runtime")) {
              return "react-vendor";
            }

            return "vendor";
          }

          if (id.includes("/src/lightspeedReference") || id.includes("/src/workspaceMenuIntents") || id.includes("/src/api")) {
            return "workspace-core";
          }

          return undefined;
        }
      }
    }
  },
  server: {
    host: "0.0.0.0",
    open: true,
    port: 5173
  }
});