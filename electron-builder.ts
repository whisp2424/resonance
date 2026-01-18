import type { Configuration } from "electron-builder";

import product from "./build/product.json" with { type: "json" };

const config: Configuration = {
    appId: product.appId,
    productName: product.name.short,
    files: [
        "dist/**/*",
        "package.json",
        "!**/.vscode/*",
        "!src/*",
        "!electron.vite.config.{js,ts,mjs,cjs}",
        "!svelte.config.mjs",
        "!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,CHANGELOG.md,README.md}",
        "!{.env,.env.*,.npmrc,pnpm-lock.yaml}",
        "!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}",
    ],
    win: {
        executableName: product.name.executable,
        target: [{ target: "nsis", arch: ["x64"] }],
    },
    nsis: {
        artifactName: "${name}-${version}-setup.${ext}",
        shortcutName: "${productName}",
        uninstallDisplayName: "${productName}",
    },
    linux: { target: ["tar.gz"] },
    npmRebuild: false,
};

export default config;
