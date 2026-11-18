import type { Page } from "@playwright/test";

export type SalesRoute = {
  /** Stable file-safe name used for screenshots and report grouping. */
  label: string;
  route: string;
  /** Human name used in the report. */
  title: string;
};

/** Routes with no dynamic segments — always audited. */
export const STATIC_SALES_ROUTES: SalesRoute[] = [
  { label: "dashboard", route: "/portal/sales", title: "Dashboard" },
  { label: "leaderboard", route: "/portal/sales/leaderboard", title: "Leaderboard" },
  { label: "documents", route: "/portal/sales/documents", title: "Documents" },
  { label: "providers-list", route: "/portal/sales/providers", title: "Providers list" },
  { label: "provider-new", route: "/portal/sales/providers/new", title: "Add provider" },
  { label: "accounts-list", route: "/portal/sales/accounts", title: "Organizations list" },
  { label: "activity", route: "/portal/sales/activity", title: "Team activity" },
  { label: "contacts-list", route: "/portal/sales/contacts", title: "Contacts list" },
  { label: "calendar", route: "/portal/sales/calendar", title: "Calendar" },
  { label: "cases-list", route: "/portal/sales/cases", title: "Cases list" },
  { label: "case-new", route: "/portal/sales/cases/new", title: "New case" },
  { label: "opportunities-list", route: "/portal/sales/opportunities", title: "Opportunities list" },
  { label: "board", route: "/portal/sales/board", title: "Pipeline board" },
  { label: "engagements-list", route: "/portal/sales/engagements", title: "Engagements list" },
  { label: "engagement-new", route: "/portal/sales/engagements/new", title: "New engagement" },
  { label: "tasks", route: "/portal/sales/tasks", title: "Tasks" },
  { label: "time-off", route: "/portal/sales/time-off", title: "Time off" },
  { label: "products", route: "/portal/sales/products", title: "Products" },
  { label: "analytics", route: "/portal/sales/analytics", title: "Analytics" },
];

type DynamicSpec = {
  label: string;
  title: string;
  /** Pages to harvest a real record link from, tried in order. */
  listRoutes: string[];
  /** Detail path prefix that harvested links must start with. */
  hrefPrefix: string;
  /** Optional suffix appended to the resolved detail path (e.g. "/plan"). */
  suffix?: string;
};

const CASE_LIST_ROUTES = ["/portal/sales/cases", "/portal/sales/calendar"];
const OPPORTUNITY_LIST_ROUTES = [
  // The opportunities list links to provider profiles, so the pipeline board and
  // the tasks queue are the reliable sources of opportunity detail links.
  "/portal/sales/board",
  "/portal/sales/tasks",
  "/portal/sales/opportunities",
];
const ENGAGEMENT_LIST_ROUTES = ["/portal/sales/engagements", "/portal/sales/calendar"];

const DYNAMIC_SPECS: DynamicSpec[] = [
  {
    label: "provider-detail",
    title: "Provider profile",
    listRoutes: ["/portal/sales/providers"],
    hrefPrefix: "/portal/sales/providers/",
  },
  {
    label: "account-detail",
    title: "Organization detail",
    listRoutes: ["/portal/sales/accounts"],
    hrefPrefix: "/portal/sales/accounts/",
  },
  {
    label: "contact-detail",
    title: "Contact detail",
    listRoutes: ["/portal/sales/contacts"],
    hrefPrefix: "/portal/sales/contacts/",
  },
  {
    label: "case-detail",
    title: "Case detail",
    listRoutes: CASE_LIST_ROUTES,
    hrefPrefix: "/portal/sales/cases/",
  },
  {
    label: "case-plan",
    title: "Case plan",
    listRoutes: CASE_LIST_ROUTES,
    hrefPrefix: "/portal/sales/cases/",
    suffix: "/plan",
  },
  {
    label: "opportunity-detail",
    title: "Opportunity detail",
    listRoutes: OPPORTUNITY_LIST_ROUTES,
    hrefPrefix: "/portal/sales/opportunities/",
  },
  {
    label: "engagement-detail",
    title: "Engagement hub",
    listRoutes: ENGAGEMENT_LIST_ROUTES,
    hrefPrefix: "/portal/sales/engagements/",
  },
  {
    label: "engagement-prepare",
    title: "Engagement prep",
    listRoutes: ENGAGEMENT_LIST_ROUTES,
    hrefPrefix: "/portal/sales/engagements/",
    suffix: "/prepare",
  },
  {
    label: "engagement-active",
    title: "Engagement in progress",
    listRoutes: ENGAGEMENT_LIST_ROUTES,
    hrefPrefix: "/portal/sales/engagements/",
    suffix: "/active",
  },
  {
    label: "engagement-call",
    title: "Engagement call",
    listRoutes: ENGAGEMENT_LIST_ROUTES,
    hrefPrefix: "/portal/sales/engagements/",
    suffix: "/call",
  },
  {
    label: "engagement-live",
    title: "Engagement live session",
    listRoutes: ENGAGEMENT_LIST_ROUTES,
    hrefPrefix: "/portal/sales/engagements/",
    suffix: "/live",
  },
  {
    label: "engagement-debrief",
    title: "Engagement debrief",
    listRoutes: ENGAGEMENT_LIST_ROUTES,
    hrefPrefix: "/portal/sales/engagements/",
    suffix: "/debrief",
  },
];

const RESERVED_SEGMENTS = new Set(["new", "edit", "import", "export"]);

async function firstDetailPath(page: Page, listRoute: string, hrefPrefix: string): Promise<string | null> {
  await page.goto(listRoute, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 12_000 }).catch(() => undefined);
  await page.waitForTimeout(1_200);
  return page.evaluate(
    ({ prefix, reserved }) => {
      const depth = prefix.split("/").filter(Boolean).length;
      const anchors = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
      for (const anchor of anchors) {
        const path = anchor.pathname;
        if (!path.startsWith(prefix)) continue;
        const segments = path.split("/").filter(Boolean);
        if (segments.length !== depth + 1) continue;
        const last = segments[segments.length - 1];
        if (reserved.includes(last)) continue;
        return path;
      }
      return null;
    },
    { prefix: hrefPrefix, reserved: [...RESERVED_SEGMENTS] },
  );
}

/**
 * Walks the list pages to find a real record for each detail route.
 * Routes whose list page has no records are reported as unresolved rather than skipped
 * silently, so an empty dataset never hides a page from the audit.
 */
export async function resolveDynamicRoutes(
  page: Page,
): Promise<{ routes: SalesRoute[]; unresolved: { label: string; title: string; reason: string }[] }> {
  const routes: SalesRoute[] = [];
  const unresolved: { label: string; title: string; reason: string }[] = [];
  const cache = new Map<string, string | null>();

  for (const spec of DYNAMIC_SPECS) {
    const cacheKey = `${spec.listRoutes.join(",")}|${spec.hrefPrefix}`;
    if (!cache.has(cacheKey)) {
      let found: string | null = null;
      for (const listRoute of spec.listRoutes) {
        found = await firstDetailPath(page, listRoute, spec.hrefPrefix);
        if (found) break;
      }
      cache.set(cacheKey, found);
    }
    // Deliberately no hardcoded id fallback: auditing a record that does not exist
    // measures the not-found screen while reporting the real page as covered.
    const base = cache.get(cacheKey) ?? null;

    if (!base) {
      unresolved.push({
        label: spec.label,
        title: spec.title,
        reason: `No record link found on ${spec.listRoutes.join(" or ")}`,
      });
      continue;
    }

    routes.push({
      label: spec.label,
      title: spec.title,
      route: `${base}${spec.suffix ?? ""}`,
    });
  }

  return { routes, unresolved };
}

export const MOBILE_VIEWPORTS = [
  { name: "iphone-se-320", width: 320, height: 568, scale: 2 },
  { name: "android-360", width: 360, height: 800, scale: 3 },
  { name: "iphone-14-390", width: 390, height: 844, scale: 3 },
  { name: "iphone-max-430", width: 430, height: 932, scale: 3 },
] as const;
