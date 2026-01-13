import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import tseslint from "typescript-eslint";

import eslintPluginReact from "eslint-plugin-react";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import eslintPluginReactRefresh from "eslint-plugin-react-refresh";

export default defineConfig(
    globalIgnores(["dist"]),
    eslint.configs.recommended,
    tseslint.configs.recommended,
    importPlugin.flatConfigs.typescript,
    eslintPluginReact.configs.flat.recommended,
    eslintPluginReact.configs.flat["jsx-runtime"],
    eslintPluginReactHooks.configs.flat.recommended,
    eslintPluginReactRefresh.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        settings: { react: { version: "detect" } },
        languageOptions: { globals: { ...globals.node, ...globals.browser } },
        rules: {
            "no-empty": ["warn", { allowEmptyCatch: true }],
            "@typescript-eslint/consistent-type-imports": "error",
            "import/consistent-type-specifier-style": ["error"],
            "import/enforce-node-protocol-usage": ["error", "always"],
            "import/no-duplicates": ["error"],
            "import/order": [
                "warn",
                {
                    "named": true,
                    "sortTypesGroup": true,
                    "distinctGroup": false,
                    "warnOnUnassignedImports": true,
                    "alphabetize": { order: "asc" },
                    "newlines-between": "always",
                    "groups": [
                        "type",
                        "builtin",
                        "external",
                        "parent",
                        "sibling",
                        "index",
                    ],
                },
            ],
        },
    },
);
