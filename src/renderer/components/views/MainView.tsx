import { useShortcut } from "@renderer/hooks/useShortcut";

export default function MainView() {
    useShortcut({ code: "Comma", ctrlOrCmd: true }, () => {
        electron.invoke("window:new", "/settings", "settings");
    });

    return <></>;
}
