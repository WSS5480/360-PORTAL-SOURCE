"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PortalMobileMenuButton } from "@/components/portal/PortalMobileMenuButton";

function isElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.closest("[hidden], [aria-hidden='true']")) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Safety net for Sales Command mobile: if a screen forgets an in-page ☰,
 * keep sidebar access available via a fixed control.
 */
export function SalesCmdMobileMenuFallback() {
  const pathname = usePathname() || "";
  const [needsFallback, setNeedsFallback] = React.useState(false);

  React.useEffect(() => {
    if (typeof document === "undefined") return;

    const evaluate = () => {
      // Match any in-page menu control, not just one naming convention. List headers use
      // `sc-mobile-list-menu`, page headers use `sales-cmd-mobile-menu`; missing one of
      // them here stacks a second fixed ☰ on top of the real one.
      const inPageMenus = document.querySelectorAll(
        ".portal-mobile-menu-btn:not(.sales-cmd-mobile-menu-fallback)",
      );
      const hasVisibleInPage = Array.from(inPageMenus).some(isElementVisible);
      setNeedsFallback(!hasVisibleInPage);
    };

    evaluate();
    const mo = new MutationObserver(() => evaluate());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", evaluate);
    // Headers often mount a tick after route paint.
    const t = window.setTimeout(evaluate, 120);

    return () => {
      mo.disconnect();
      window.removeEventListener("resize", evaluate);
      window.clearTimeout(t);
    };
  }, [pathname]);

  if (!needsFallback) return null;

  return (
    <PortalMobileMenuButton className="sales-cmd-mobile-menu sales-cmd-mobile-menu-fallback" />
  );
}
