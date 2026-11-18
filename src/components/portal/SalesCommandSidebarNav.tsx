"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import React from "react";
import { AchievementBadgesRow } from "@/components/sales/AchievementBadgesRow";
import { SalesSidebarNavIcon } from "@/components/portal/sidebarNavIcons";
import type { EarnedAchievementBadge } from "@/lib/surgical-sales/executionAchievementBadges";
import {
  SALES_SIDEBAR_SECTIONS,
  type SalesSidebarCounts,
  type SalesSidebarNavItem,
} from "@/lib/surgical-sales/salesSidebarNav";

function isPathActive(pathname: string, href: string, exact = false): boolean {
  const base = href.split("?")[0];
  if (!pathname) return false;
  if (pathname === base || pathname === `${base}/`) return true;
  if (exact) return false;
  return pathname.startsWith(base + "/");
}

function isSalesItemActive(pathname: string, searchParams: URLSearchParams, item: SalesSidebarNavItem): boolean {
  const base = item.href.split("?")[0];
  const wantLane = new URL(item.href, "http://local").searchParams.get("lane");

  if (wantLane) {
    return pathname.startsWith(base) && searchParams.get("lane") === wantLane;
  }

  if (isPathActive(pathname, item.href, item.exact === true)) return true;
  if (item.exact) return false;
  return item.activePrefixes?.some((prefix) => isPathActive(pathname, prefix)) ?? false;
}

function badgeForItem(counts: SalesSidebarCounts, item: SalesSidebarNavItem) {
  if (!item.countKey) return null;
  const n = counts[item.countKey];
  if (n == null || n <= 0) return null;
  return { n };
}

export function SalesCommandSidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [counts, setCounts] = React.useState<SalesSidebarCounts>({});
  const [profileBadges, setProfileBadges] = React.useState<EarnedAchievementBadge[]>([]);

  React.useEffect(() => {
    const ac = new AbortController();
    void (async () => {
      try {
        const res = await fetch("/api/portal/sales/sidebar-summary", {
          cache: "no-store",
          signal: ac.signal,
        });
        const j = (await res.json()) as {
          ok?: boolean;
          counts?: SalesSidebarCounts;
          profile?: { achievement_badges?: EarnedAchievementBadge[] };
        };
        if (j.ok && j.counts) setCounts(j.counts);
        if (j.ok && j.profile?.achievement_badges) setProfileBadges(j.profile.achievement_badges);
      } catch {
        /* optional badges */
      }
    })();
    return () => ac.abort();
  }, []);

  return (
    <div className="portal-sidebar-sales">
      {SALES_SIDEBAR_SECTIONS.map((section) => (
        <div key={section.id} className="portal-sidebar-sales-section">
          <div className="portal-sidebar-sales-section-label">{section.label}</div>
          <nav className="portal-sidebar-sales-nav" aria-label={section.label}>
            {section.items.map((item) => {
              const active = isSalesItemActive(pathname, searchParams, item);
              const badge = badgeForItem(counts, item);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`portal-sidebar-sales-link${active ? " portal-sidebar-sales-link--active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="portal-sidebar-sales-link__icon">
                    <SalesSidebarNavIcon id={item.iconId} />
                  </span>
                  <span className="portal-sidebar-sales-link__label">{item.label}</span>
                  {badge ? (
                    <span className="portal-sidebar-sales-badge" aria-label={`${badge.n} pending`}>
                      {badge.n}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}
      {profileBadges.length > 0 ? (
        <div className="portal-sidebar-sales-section" style={{ paddingTop: 8 }}>
          <div className="portal-sidebar-sales-section-label">Your achievements</div>
          <AchievementBadgesRow badges={profileBadges} compact max={4} />
        </div>
      ) : null}
    </div>
  );
}
