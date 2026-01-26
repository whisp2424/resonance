import type { Rectangle } from "electron";

import { screen } from "electron";

export const validateBounds = (
    bounds: Partial<Rectangle>,
): Partial<Rectangle> => {
    const { x, y, width, height } = bounds;

    if (
        x === undefined ||
        y === undefined ||
        width === undefined ||
        height === undefined
    ) {
        return bounds;
    }

    const displays = screen.getAllDisplays();
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const targetDisplay = screen.getDisplayNearestPoint({
        x: centerX,
        y: centerY,
    });

    let isVisible = false;
    for (const display of displays) {
        const { x: dx, y: dy, width: dw, height: dh } = display.workArea;

        const intersects =
            x < dx + dw && x + width > dx && y < dy + dh && y + height > dy;

        if (intersects) {
            isVisible = true;
            break;
        }
    }

    if (!isVisible) {
        const workArea = targetDisplay.workArea;
        return {
            x: workArea.x + Math.floor((workArea.width - width) / 2),
            y: workArea.y + Math.floor((workArea.height - height) / 2),
            width,
            height,
        };
    }

    const workArea = targetDisplay.workArea;
    const minVisibleWidth = Math.min(100, width);
    const minVisibleHeight = Math.min(50, height);

    let adjustedX = x;
    let adjustedY = y;

    if (x + width < workArea.x + minVisibleWidth) {
        adjustedX = workArea.x + minVisibleWidth - width;
    } else if (x > workArea.x + workArea.width - minVisibleWidth) {
        adjustedX = workArea.x + workArea.width - minVisibleWidth;
    }

    if (y + height < workArea.y + minVisibleHeight) {
        adjustedY = workArea.y + minVisibleHeight - height;
    } else if (y > workArea.y + workArea.height - minVisibleHeight) {
        adjustedY = workArea.y + workArea.height - minVisibleHeight;
    }

    return {
        x: adjustedX,
        y: adjustedY,
        width,
        height,
    };
};
