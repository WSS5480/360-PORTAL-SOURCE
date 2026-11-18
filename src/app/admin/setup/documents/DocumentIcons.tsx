import React from "react";
import styles from "./documents.module.css";

type IconProps = { size?: number; className?: string; stroke?: string };

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    className,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };
}

export function IconFolder({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    </svg>
  );
}

export function IconFile({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

export function IconChevronDown({ size = 14, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronRight({ size = 14, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconHome({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
    </svg>
  );
}

export function IconUpload({ size = 20, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function IconSettings({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

export function IconList({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function IconGrid({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function IconLink({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinecap="round">
      <path d="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1" />
      <path d="M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />
    </svg>
  );
}

export function IconPanelLeft({ size = 16, className, stroke = "currentColor" }: IconProps) {
  return (
    <svg {...base(size, className)} viewBox="0 0 24 24" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

export function FileTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const stroke = "var(--brand-700)";
  if (type === "LINK" || type === "VIDEO") return <IconLink size={size} stroke={stroke} />;
  return <IconFile size={size} stroke={stroke} />;
}

export function AccessPill({
  level,
  title,
}: {
  level: "all_reps" | "territory_managers" | "admin_only";
  title?: string;
}) {
  const labels = {
    all_reps: "All reps",
    territory_managers: "Managers only",
    admin_only: "Admin only",
  };
  const cls =
    level === "all_reps" ? styles.pillAllReps : level === "territory_managers" ? styles.pillTm : styles.pillAdmin;
  return (
    <span className={`${styles.pill} ${cls}`} title={title}>
      {labels[level]}
    </span>
  );
}
