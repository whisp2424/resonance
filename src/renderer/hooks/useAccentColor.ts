import { useEffect, useState } from "react";

function stripAlpha(hexColor: string) {
    if (hexColor.length === 8)
        return hexColor.substring(0, hexColor.length - 2);
    return hexColor;
}

export const useAccentColor = (): string => {
    const [accentColor, setAccentColor] = useState("#0078d4");

    useEffect(() => {
        let isMounted = true;

        electron.invoke("system:getAccentColor").then((color) => {
            if (isMounted) setAccentColor(`#${stripAlpha(color)}`);
        });

        const cleanup = electron.send(
            "system:onAccentColorChanged",
            (color) => {
                setAccentColor(`#${stripAlpha(color)}`);
            },
        );

        return () => {
            isMounted = false;
            cleanup();
        };
    }, []);

    return accentColor;
};
