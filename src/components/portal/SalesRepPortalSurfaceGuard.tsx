"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  isCustomerPortalPathForSalesRep,
  postLoginFlagsFromMe,
  shouldBlockCustomerPortalSurface,
} from "@/lib/auth/resolvePostLoginPath";

/**
 * Client-side safety net: pure sales-rep users must stay in Sales Command.
 * Sales reps with a hospital/customer account may use order/IVR surfaces.
 */
export default function SalesRepPortalSurfaceGuard() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (!isCustomerPortalPathForSalesRep(pathname)) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/me", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (shouldBlockCustomerPortalSurface(postLoginFlagsFromMe(json))) {
          window.location.replace("/portal/sales");
        }
      } catch {
        // ignore — auth failures are handled elsewhere
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
