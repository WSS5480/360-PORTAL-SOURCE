"use client";

import { clearPlaceOrderOverlayFlag } from "@/lib/portal/portalOverlaySession";
import { useEffect } from "react";

/** Clears cross-page "processing order" overlay when viewing an order that is not mid–auto-submit. */
export default function OrderPortalOverlayCleanup({
  autosubmit,
  stripeReturnFromPay,
}: {
  autosubmit: boolean;
  stripeReturnFromPay: boolean;
}) {
  useEffect(() => {
    if (autosubmit || stripeReturnFromPay) return;
    clearPlaceOrderOverlayFlag();
  }, [autosubmit, stripeReturnFromPay]);

  return null;
}
