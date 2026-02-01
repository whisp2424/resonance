import Button from "@renderer/components/ui/Button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import TextInput from "@renderer/components/ui/TextInput";
import { useCallback, useEffect, useState } from "react";

import IconRefresh from "~icons/lucide/refresh-cw";
import IconTrash from "~icons/lucide/trash-2";

interface TableSchema {
    name: string;
    type: string;
    notnull: number;
    dflt_value: unknown;
    pk: number;
}

export function DatabaseDebug() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>("");
    const [tableSchema, setTableSchema] = useState<TableSchema[]>([]);
    const [query, setQuery] = useState<string>("");
    const [results, setResults] = useState<Record<string, unknown>[]>([]);
    const [error, setError] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const loadTables = useCallback(async () => {
        try {
            const tableList = await electron.invoke("dev:getTables");
            setTables(tableList);
        } catch (err) {
            const msg = String(err);
            setError(msg);
            console.error(msg);
        }
    }, []);

    const selectTable = useCallback(async (table: string | null) => {
        if (!table) return;
        setSelectedTable(table);
        setQuery(`SELECT * FROM ${table} LIMIT 100`);
        setResults([]);
        setError("");

        try {
            const [schema] = await Promise.all([
                electron.invoke("dev:getTableSchema", table),
                electron.invoke("dev:getTableCount", table),
            ]);

            setTableSchema(schema);
            setResults([]);
        } catch (err) {
            const msg = String(err);
            setError(msg);
            console.error(msg);
        }
    }, []);

    const executeQuery = useCallback(async () => {
        if (!query.trim()) return;
        setIsLoading(true);
        setError("");

        try {
            const result = await electron.invoke("dev:query", query);
            setResults(result);
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Query failed";
            setError(msg);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [query]);

    const deleteRow = useCallback(
        async (row: Record<string, unknown>) => {
            try {
                await electron.invoke("dev:delete", selectedTable, row);
                await executeQuery();
            } catch (err) {
                const msg =
                    err instanceof Error ? err.message : "Delete failed";
                setError(msg);
            }
        },
        [selectedTable, executeQuery],
    );

    useEffect(() => {
        loadTables();
    }, [loadTables]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <Select value={selectedTable} onValueChange={selectTable}>
                    <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select table" />
                    </SelectTrigger>
                    <SelectContent>
                        {tables.map((table) => (
                            <SelectItem key={table} value={table}>
                                {table}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    icon={IconRefresh}
                    variant="secondary"
                    onClick={loadTables}
                    className="ml-auto">
                    Reload
                </Button>
            </div>

            <div className="rounded-md border border-neutral-300 bg-black/4 p-4 dark:border-neutral-800 dark:bg-white/2">
                <div className="grid grid-cols-[5rem_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                    {tableSchema.map((col) => (
                        <div key={col.name} className="contents">
                            <span className="opacity-50">{col.name}</span>
                            <span>
                                {col.type}
                                {col.pk ? " PK" : ""}
                                {col.notnull ? "*" : ""}
                                {col.dflt_value !== null
                                    ? ` default: ${String(col.dflt_value)}`
                                    : ""}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex w-full flex-col gap-2">
                <div className="flex gap-2">
                    <TextInput
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 font-mono text-sm"
                        placeholder="Enter SQL query..."
                    />
                    <Button
                        onClick={executeQuery}
                        disabled={isLoading || !query.trim()}
                        variant="primary"
                        className="min-w-25">
                        {isLoading ? "Running..." : "Run Query"}
                    </Button>
                </div>
            </div>

            {results.length === 0 ? (
                <div className="flex items-center justify-center p-4 text-sm opacity-50">
                    {isLoading ? "Loading..." : error || "No results"}
                </div>
            ) : (
                <div className="overflow-auto rounded-md border border-neutral-300 bg-black/4 dark:border-neutral-800 dark:bg-white/2">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-linear-to-b from-[#f5f5f5] to-[#e8e8e8] shadow-[0_0.5px_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:from-[#3d3d3d] dark:to-[#323232] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                            <tr>
                                {Object.keys(results[0]).map((col) => (
                                    <th
                                        key={col}
                                        className="border-b border-neutral-200 px-3 py-2 text-xs font-normal whitespace-nowrap dark:border-neutral-700">
                                        {col}
                                    </th>
                                ))}
                                <th className="w-10 border-b border-neutral-200 px-3 py-2 text-xs font-normal whitespace-nowrap dark:border-neutral-700" />
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((row, idx) => (
                                <tr
                                    key={idx}
                                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
                                    {Object.keys(row).map((col) => {
                                        const value = row[col];
                                        return (
                                            <td
                                                key={col}
                                                className="max-w-xs truncate px-3 py-2 font-mono text-xs"
                                                title={JSON.stringify(value)}>
                                                {JSON.stringify(value)}
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-2">
                                        <Button
                                            icon={IconTrash}
                                            onClick={() => deleteRow(row)}
                                            className="text-xs"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
