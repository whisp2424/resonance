import pc from "picocolors";

export type LogSeverity = "info" | "warning" | "error";

export const log = (
    message: string | Error,
    category: string,
    severity: LogSeverity = "info",
): void => {
    const isRenderer = typeof window !== "undefined";
    const processName = isRenderer ? "renderer" : "main";

    if (isRenderer) {
        const msg =
            message instanceof Error
                ? message.stack || message.message
                : message;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).electron.invoke("app:log", msg, category, severity);
        return;
    }

    const colors = {
        info: pc.blue,
        warning: pc.yellow,
        error: pc.red,
    };

    const color = colors[severity] || pc.white;
    const timestamp = new Date().toLocaleTimeString([], {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

    const msg =
        message instanceof Error ? message.stack || message.message : message;

    console.log(
        `${pc.dim(`[${processName}] ${timestamp}`)} ` +
            `${color(`${category}(${severity})`)} ` +
            `${pc.dim("~")} ${msg}`,
    );
};
