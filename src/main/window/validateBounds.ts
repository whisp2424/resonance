import type { Rectangle } from "electron";

import { screen } from "electron";

const VISIBILITY_RATIO = 0.15;

export const validateBounds = (
    bounds: Partial<Rectangle>,
): Partial<Rectangle> => {
    const { width, height } = bounds;
    let { x, y } = bounds;

    if (width === undefined || height === undefined)
        return {
            x,
            y,
            width,
            height,
        };

    const displays = screen.getAllDisplays();

    if (x === undefined || y === undefined)
        return {
            x,
            y,
            width,
            height,
        };

    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const targetDisplay = screen.getDisplayNearestPoint({
        x: centerX,
        y: centerY,
    });

    let isSufficientlyVisible = false;
    for (const display of displays) {
        const { x: dx, y: dy, width: dw, height: dh } = display.workArea;
        const visibleWidth = Math.min(x + width, dx + dw) - Math.max(x, dx);
        const visibleHeight = Math.min(y + height, dy + dh) - Math.max(y, dy);

        if (visibleWidth <= 0 || visibleHeight <= 0) continue;

        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = width * height;
        const visibleRatio = visibleArea / totalArea;

        if (visibleRatio >= VISIBILITY_RATIO) {
            isSufficientlyVisible = true;
            break;
        }
    }

    if (!isSufficientlyVisible) {
        const workArea = targetDisplay.workArea;
        x = workArea.x + Math.floor((workArea.width - width) / 2);
        y = workArea.y + Math.floor((workArea.height - height) / 2);
    } else {
        const workArea = targetDisplay.workArea;
        const minVisibleWidth = Math.min(100, width);
        const minVisibleHeight = Math.min(50, height);

        if (x + width < workArea.x + minVisibleWidth) {
            x = workArea.x + minVisibleWidth - width;
        } else if (x > workArea.x + workArea.width - minVisibleWidth) {
            x = workArea.x + workArea.width - minVisibleWidth;
        }

        if (y + height < workArea.y + minVisibleHeight) {
            y = workArea.y + minVisibleHeight - height;
        } else if (y > workArea.y + workArea.height - minVisibleHeight) {
            y = workArea.y + workArea.height - minVisibleHeight;
        }
    }

    return {
        x,
        y,
        width,
        height,
    };
};
