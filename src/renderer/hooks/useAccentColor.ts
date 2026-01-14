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
            const initialColor = await window.electronAPI.getAccentColor();
            console.log(initialColor);
            setAccentColor(`#${stripAlpha(initialColor)}`);
        })();

        const handleAccentColorChange = (color: string) =>
            setAccentColor(`#${stripAlpha(color)}`);

        window.electronAPI.onAccentColorChange(handleAccentColorChange);
        return () => window.electronAPI.removeListeners("accentColor");
    }, []);

    return accentColor;
};
