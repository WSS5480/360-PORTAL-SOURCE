"use client";

import React from "react";

/**
 * True while the viewport is at or below `maxWidthPx`.
 *
 * Starts false so the first client render matches the server, then syncs on mount.
 * Use it for layout choices that cannot be expressed in CSS alone (for example,
 * swapping a data table for stacked cards).
 */
export function useNarrowViewport(maxWidthPx = 640): boolean {
  const [narrow, setNarrow] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [maxWidthPx]);

  return narrow;
}
