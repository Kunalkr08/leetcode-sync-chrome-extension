import { defineConfig } from "vite";
import { dirname, resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(rootDir, "src/background/index.ts"),
        content: resolve(rootDir, "src/content/index.ts"),
        "page-bridge": resolve(rootDir, "src/content/page-bridge.ts"),
        popup: resolve(rootDir, "src/popup/index.html"),
        options: resolve(rootDir, "src/options/index.html")
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "content") return "content.js";
          if (chunk.name === "page-bridge") return "page-bridge.js";
          return "assets/[name]-[hash].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  },
  plugins: [{
    name: "copy-extension-manifest",
    closeBundle() {
      mkdirSync(resolve(rootDir, "dist"), { recursive: true });
      copyFileSync(resolve(rootDir, "manifest.json"), resolve(rootDir, "dist/manifest.json"));
      copyFileSync(resolve(rootDir, "dist/src/popup/index.html"), resolve(rootDir, "dist/popup.html"));
      copyFileSync(resolve(rootDir, "dist/src/options/index.html"), resolve(rootDir, "dist/options.html"));
    }
  }]
});
