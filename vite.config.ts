import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Phone browsers only expose the camera on secure origins, so dev/preview
// serve HTTPS with a self-signed cert to make barcode scanning work over LAN.
export default defineConfig({
  // Relative base so the build works under GitHub Pages' /<repo>/ subpath.
  base: "./",
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
