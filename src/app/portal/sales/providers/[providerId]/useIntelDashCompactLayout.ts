"use client";

import React from "react";

/** True on viewports where Intelligence uses collapsed sections and compact cards. */
export function useIntelDashCompactLayout(): boolean {
  const [compact, setCompact] = React.useState(true);

  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 719px)");
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return compact;
}
