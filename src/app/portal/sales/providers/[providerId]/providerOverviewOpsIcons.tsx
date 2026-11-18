import type { ReactNode } from "react";
import type { DiscoveryOverviewGroupId } from "@/lib/surgical-sales/providerOverviewBriefingCopy";

type OpsIconProps = {
  className?: string;
  size?: number;
};

function Svg({
  children,
  className,
  size,
}: OpsIconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size ?? 16}
      height={size ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function OpsReadinessSectionIcon({ className, size }: OpsIconProps) {
  return (
    <Svg className={className} size={size}>
      <path d="M4 6h16M4 12h10M4 18h6" />
      <circle cx="18" cy="15" r="3" />
      <path d="M18 12v1" />
    </Svg>
  );
}

export function OpsBlockersIcon({ className, size }: OpsIconProps) {
  return (
    <Svg className={className} size={size}>
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </Svg>
  );
}

export function OpsReadinessGroupIcon({
  groupId,
  className,
  size,
}: OpsIconProps & { groupId: DiscoveryOverviewGroupId }) {
  switch (groupId) {
    case "access_readiness":
      return (
        <Svg className={className} size={size}>
          <circle cx="8" cy="15" r="4" />
          <path d="M11.5 12.5 19 5" />
          <path d="m15 5 4 4" />
          <path d="M19 9v4" />
        </Svg>
      );
    case "clinical_fit":
      return (
        <Svg className={className} size={size}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </Svg>
      );
    case "champion_landscape":
      return (
        <Svg className={className} size={size}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </Svg>
      );
    default:
      return <OpsReadinessSectionIcon className={className} size={size} />;
  }
}
