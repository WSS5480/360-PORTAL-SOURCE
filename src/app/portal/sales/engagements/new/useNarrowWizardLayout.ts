"use client";

import React from "react";

/** True at ≤480px — matches engagement wizard mobile CSS breakpoint (390–400px included). */
export function useNarrowWizardLayout(maxWidthPx = 480): boolean {
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
