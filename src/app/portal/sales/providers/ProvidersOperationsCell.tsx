"use client";

import React from "react";

type TruncateMode = "never" | "always" | "when-needed";

export function ProvidersOperationsCell({
  display,
  full,
  value,
  truncate = "when-needed",
  className,
  children,
}: {
  /** Shown in the table cell. */
  display?: string;
  /** Full text for hover tooltip (defaults to display). */
  full?: string;
  /** @deprecated Use display */
  value?: string;
  truncate?: TruncateMode;
  className?: string;
  children?: React.ReactNode;
}) {
  const text = display ?? value ?? "";
  const tooltip = full ?? text;
  const ref = React.useRef<HTMLSpanElement>(null);
  const [overflowed, setOverflowed] = React.useState(false);

  const checkOverflow = React.useCallback(() => {
    const el = ref.current;
    if (!el || truncate === "never") {
      setOverflowed(false);
      return;
    }
    setOverflowed(el.scrollWidth > el.clientWidth + 1);
  }, [truncate]);

  React.useLayoutEffect(() => {
    checkOverflow();
  }, [text, checkOverflow]);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || truncate === "never") return undefined;
    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(el);
    return () => ro.disconnect();
  }, [truncate, checkOverflow]);

  const truncateClass =
    truncate === "never"
      ? "providers-ops-text"
      : truncate === "always"
        ? "providers-ops-text providers-ops-text--truncate"
        : "providers-ops-text providers-ops-text--truncate-optional";

  const title =
    truncate === "never"
      ? undefined
      : tooltip !== text
        ? tooltip
        : overflowed
          ? tooltip
          : undefined;

  return (
    <span ref={ref} className={className ? `${truncateClass} ${className}` : truncateClass} title={title}>
      {children ?? text}
    </span>
  );
}
