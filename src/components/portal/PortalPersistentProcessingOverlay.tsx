"use client";

import PortalProcessingOverlay from "@/components/portal/PortalProcessingOverlay";
import { SS_PAYMENT, SS_PLACE_ORDER, clearPlaceOrderOverlayFlag } from "@/lib/portal/portalOverlaySession";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Keeps a full-screen processing overlay visible across navigations while sessionStorage flags are set.
 */
export default function PortalPersistentProcessingOverlay() {
  const pathname = usePathname();
  const [placeOrder, setPlaceOrder] = useState(false);
  const [payment, setPayment] = useState(false);

  function readStorage() {
    if (typeof window === "undefined") return;
    try {
      setPlaceOrder(sessionStorage.getItem(SS_PLACE_ORDER) === "1");
      setPayment(sessionStorage.getItem(SS_PAYMENT) === "1");
    } catch {
      setPlaceOrder(false);
      setPayment(false);
    }
  }

  useEffect(() => {
    readStorage();
  }, [pathname]);

  useEffect(() => {
    function onSync() {
      readStorage();
    }
    window.addEventListener("portal-overlay-sync", onSync);
    return () => window.removeEventListener("portal-overlay-sync", onSync);
  }, []);

  // Orders list: draft/create landed here — clear place-order flag.
  useEffect(() => {
    if (pathname === "/portal/orders") {
      clearPlaceOrderOverlayFlag();
    }
  }, [pathname]);

  const show = placeOrder || payment;

  return (
    <PortalProcessingOverlay
      show={show}
      success={false}
      title={payment ? "Processing payment…" : placeOrder ? "Processing your order…" : "Working…"}
      subtitle={
        payment
          ? "Securely confirming with your bank. Please keep this tab open."
          : "Stay on this page until checkout or your order finishes loading."
      }
      zIndex={270}
    />
  );
}
