import { useEffect, useState } from "react";

const stripAlpha = (hexColor: string) => {
    if (hexColor.length === 8)
        return hexColor.substring(0, hexColor.length - 2);
    return hexColor;
};

export const useAccentColor = (): string => {
    const [accentColor, setAccentColor] = useState("#0078d4");

    useEffect(() => {
        (async () => {
            const initialColor = await electron.system.getAccentColor();
            console.log(initialColor);
            setAccentColor(`#${stripAlpha(initialColor)}`);
        })();

        const handleAccentColorChange = (color: string) =>
            setAccentColor(`#${stripAlpha(color)}`);

        const cleanup = electron.system.onAccentColorChanged(
            handleAccentColorChange,
        );
        return cleanup;
    }, []);

    return accentColor;
};
