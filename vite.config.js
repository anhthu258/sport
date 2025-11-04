import { defineConfig } from "vite";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
// Ensure correct base path for GitHub Pages (served under /sport/)
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    // Create a 404.html that mirrors index.html for GitHub Pages SPA fallback
    {
      name: "gh-pages-404-fallback",
      closeBundle() {
        try {
          const outDir = "dist";
          const src = join(outDir, "index.html");
          const dest = join(outDir, "404.html");
          if (existsSync(src)) copyFileSync(src, dest);
        } catch {
          // no-op
        }
      },
    },
  ],
  base: command === "serve" ? "/" : "/sport/",
}));
