import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { is } from "@electron-toolkit/utils";
import { client } from "@main/database";

export function registerDatabaseHandlers(
    ipc: IpcListener<MainIpcHandleEvents>,
) {
    ipc.handle("dev:getTables", async () => {
        if (!is.dev) {
            throw new Error(
                "Developer tools are only available during development",
            );
        }

        const result = await client.execute(`
            SELECT name FROM sqlite_master
            WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_drizzle_%'
        `);

        return result.rows.map(
            (row) => (row as unknown as { name: string }).name,
        );
    });

    ipc.handle("dev:getTableSchema", async (_, table) => {
        const result = await client.execute(`PRAGMA table_info(${table})`);
        return result.rows as unknown as {
            name: string;
            type: string;
            notnull: number;
            dflt_value: unknown;
            pk: number;
        }[];
    });

    ipc.handle("dev:getTableCount", async (_, table) => {
        if (!is.dev) {
            throw new Error(
                "Developer tools are only available during developmentt",
            );
        }

        const result = await client.execute(
            `SELECT COUNT(*) as count FROM ${table}`,
        );

        return (result.rows[0] as unknown as { count: number }).count;
    });

    ipc.handle("dev:query", async (_, sql) => {
        if (!is.dev) {
            throw new Error(
                "Developer tools are only available during development",
            );
        }

        const result = await client.execute(sql);
        return result.rows;
    });

    ipc.handle("dev:delete", async (_, table, where) => {
        if (!is.dev) {
            throw new Error(
                "Developer tools are only available during development",
            );
        }

        const whereClause = Object.entries(where)
            .map(([key, value]) => {
                if (value === null) return `${key} IS NULL`;
                if (typeof value === "string")
                    return `${key} = '${value.replace(/'/g, "''")}'`;
                return `${key} = ${value}`;
            })
            .join(" AND ");

        await client.execute(`DELETE FROM ${table} WHERE ${whereClause}`);
    });
}
