import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import icons from "unplugin-icons/vite";
import svgr from "vite-plugin-svgr";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    main: {
        build: { outDir: "dist/main" },
        resolve: {
            alias: {
                "@": path.join(__dirname, "src/main"),
            },
        },
    },
    preload: {
        build: { outDir: "dist/preload" },
        resolve: {
            alias: {
                "@": path.join(__dirname, "src/main"),
            },
        },
    },
    renderer: {
        build: { outDir: "dist/renderer" },
        plugins: [
            react(),
            tailwindcss(),
            icons({ compiler: "jsx", jsx: "react" }),
            svgr(),
        ],
        resolve: {
            alias: {
                "@": path.join(__dirname, "src/renderer"),
            },
        },
    },
});
