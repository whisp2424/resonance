import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import icons from "unplugin-icons/vite";
import svgr from "vite-plugin-svgr";

import product from "./build/product.json" with { type: "json" };

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    main: {
        build: { outDir: "dist/main" },
        resolve: {
            alias: {
                "@main": path.join(__dirname, "src/main"),
                "@shared": path.join(__dirname, "src/shared"),
            },
        },
    },
    preload: {
        build: { outDir: "dist/preload" },
        resolve: {
            alias: {
                "@main": path.join(__dirname, "src/main"),
                "@preload": path.join(__dirname, "src/preload"),
            },
        },
    },
    renderer: {
        build: { outDir: "dist/renderer" },
        define: {
            APP_NAME: JSON.stringify(product.name.short),
        },
        plugins: [
            react(),
            tailwindcss(),
            icons({ compiler: "jsx", jsx: "react" }),
            svgr(),
        ],
        resolve: {
            alias: {
                "@renderer": path.join(__dirname, "src/renderer"),
                "@shared": path.join(__dirname, "src/shared"),
            },
        },
    },
});
