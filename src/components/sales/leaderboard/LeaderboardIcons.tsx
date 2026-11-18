import type { AchievementBadgeId } from "@/lib/surgical-sales/executionAchievementBadges";

const iconProps = {
  width: 12,
  height: 12,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

export function LeaderboardMedalIcon({ tier }: { tier: "gold" | "silver" | "bronze" }) {
  const fill =
    tier === "gold" ? "#f59e0b" : tier === "silver" ? "#94a3b8" : "#c2410c";
  return (
    <svg {...iconProps} width={14} height={14}>
      <circle cx="12" cy="9" r="5" fill={fill} stroke={fill} strokeWidth="1.5" />
      <path d="M8.5 14 7 21l5-2.5L17 21l-1.5-7" stroke={fill} fill="none" />
    </svg>
  );
}

export function LeaderboardTrophyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg {...iconProps} width={size} height={size}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 4H5a2 2 0 0 0 0 4h2M17 4h2a2 2 0 0 1 0 4h-2" />
    </svg>
  );
}

export function LeaderboardStreakIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3c-1 3-4 4-4 8a4 4 0 0 0 8 0c0-4-3-5-4-8z" />
      <path d="M12 15v3" />
    </svg>
  );
}

export function LeaderboardRankUpIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 19V5M7 10l5-5 5 5" />
    </svg>
  );
}

export function LeaderboardRankDownIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 5v14M7 14l5 5 5-5" />
    </svg>
  );
}

export function AchievementBadgeIcon({ id }: { id: AchievementBadgeId | string }) {
  switch (id) {
    case "intel_hunter":
      return (
        <svg {...iconProps}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "field_investigator":
    case "case_explorer":
    case "first_observation":
    case "observation_pro":
      return (
        <svg {...iconProps}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "debrief_master":
      return (
        <svg {...iconProps}>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    case "opportunity_builder":
      return (
        <svg {...iconProps}>
          <path d="M12 3v18M3 12h18" />
          <rect x="7" y="7" width="10" height="10" rx="1" />
        </svg>
      );
    case "competitive_scout":
      return (
        <svg {...iconProps}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "case_closer":
    case "first_product_case":
    case "case_commander":
      return (
        <svg {...iconProps}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "first_product_adoption":
      return (
        <svg {...iconProps}>
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "momentum_leader":
    case "rising_star":
      return (
        <svg {...iconProps}>
          <path d="M4 19V5M4 19h16M8 17V9M12 17V7M16 17v-4" />
        </svg>
      );
    default:
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
        </svg>
      );
  }
}
