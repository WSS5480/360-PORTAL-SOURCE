export type SalesSidebarCountKey =
  | "providers_active"
  | "cases_upcoming"
  | "tasks_open"
  | "blockers";

export type SalesSidebarCounts = Partial<Record<SalesSidebarCountKey, number>>;

export type SalesSidebarNavItem = {
  id: string;
  label: string;
  href: string;
  /** When true, only the exact path (not child routes) counts as active. */
  exact?: boolean;
  activePrefixes?: string[];
  countKey?: SalesSidebarCountKey;
  iconId: SalesSidebarIconId;
};

export type SalesSidebarNavSection = {
  id: string;
  label: string;
  items: SalesSidebarNavItem[];
};

export type SalesSidebarIconId =
  | "dashboard"
  | "providers"
  | "organizations"
  | "calendar"
  | "cases"
  | "initiatives"
  | "products"
  | "analytics"
  | "pipeline"
  | "leaderboard"
  | "time_off"
  | "documents"
  | "observation_forms"
  | "activity";

export const SALES_SIDEBAR_SECTIONS: SalesSidebarNavSection[] = [
  {
    id: "command",
    label: "Sales Command",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/portal/sales", exact: true, iconId: "dashboard" },
      {
        id: "leaderboard",
        label: "Leaderboard",
        href: "/portal/sales/leaderboard",
        activePrefixes: ["/portal/sales/leaderboard"],
        iconId: "leaderboard",
      },
      {
        id: "documents",
        label: "Documents",
        href: "/portal/sales/documents",
        activePrefixes: ["/portal/sales/documents"],
        iconId: "documents",
      },
      {
        id: "providers",
        label: "Providers",
        href: "/portal/sales/providers",
        activePrefixes: ["/portal/sales/providers", "/portal/sales/contacts"],
        countKey: "providers_active",
        iconId: "providers",
      },
      {
        id: "organizations",
        label: "Organizations",
        href: "/portal/sales/accounts",
        activePrefixes: ["/portal/sales/accounts"],
        iconId: "organizations",
      },
      {
        id: "activity",
        label: "Activity",
        href: "/portal/sales/activity",
        activePrefixes: ["/portal/sales/activity"],
        iconId: "activity",
      },
    ],
  },
  {
    id: "field",
    label: "Field Execution",
    items: [
      {
        id: "calendar",
        label: "Calendar",
        href: "/portal/sales/calendar",
        activePrefixes: ["/portal/sales/calendar"],
        iconId: "calendar",
      },
      {
        id: "cases",
        label: "Cases",
        href: "/portal/sales/cases",
        activePrefixes: ["/portal/sales/cases"],
        countKey: "cases_upcoming",
        iconId: "cases",
      },
      {
        id: "observation_forms",
        label: "Observation forms",
        href: "/portal/sales/observation-forms",
        activePrefixes: ["/portal/sales/observation-forms"],
        iconId: "observation_forms",
      },
      {
        id: "pipeline",
        label: "Pipeline",
        href: "/portal/sales/pipeline",
        activePrefixes: ["/portal/sales/pipeline"],
        iconId: "pipeline",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "initiatives",
        label: "Opportunities",
        href: "/portal/sales/opportunities",
        activePrefixes: ["/portal/sales/opportunities"],
        iconId: "initiatives",
      },
      {
        id: "time_off",
        label: "Time off",
        href: "/portal/sales/time-off",
        activePrefixes: ["/portal/sales/time-off"],
        iconId: "time_off",
      },
    ],
  },
];
