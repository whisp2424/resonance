import type { Config } from "drizzle-kit";

const config: Config = {
    out: "./drizzle",
    schema: "./src/shared/database/schema.ts",
    dialect: "sqlite",
    dbCredentials: {
        url: "file:database.db",
    },
};

export default config;
