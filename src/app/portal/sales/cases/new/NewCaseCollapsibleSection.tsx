"use client";

import React from "react";

export function NewCaseCollapsibleSection({
  title,
  hint,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = controlled ? open : internalOpen;

  return (
    <details
      className={`new-case-collapse${className ? ` ${className}` : ""}`}
      open={isOpen}
      onToggle={(e) => {
        const next = e.currentTarget.open;
        if (controlled) onOpenChange?.(next);
        else setInternalOpen(next);
      }}
    >
      <summary>
        <span className="new-case-collapse-title">{title}</span>
        {hint && !isOpen ? <span className="new-case-collapse-hint">{hint}</span> : null}
      </summary>
      <div className="new-case-collapse-body">{children}</div>
    </details>
  );
}
