/**
 * Persists "processing" UI across full page navigations (e.g. place order → order page → payment).
 * PortalPersistentProcessingOverlay reads these flags; clear when the flow completes.
 */
export const SS_PLACE_ORDER = "portal_overlay_place_order_v1";
export const SS_PAYMENT = "portal_overlay_payment_v1";

export function setPlaceOrderOverlayFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_PLACE_ORDER, "1");
    window.dispatchEvent(new Event("portal-overlay-sync"));
  } catch {
    /* ignore */
  }
}

export function clearPlaceOrderOverlayFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SS_PLACE_ORDER);
    window.dispatchEvent(new Event("portal-overlay-sync"));
  } catch {
    /* ignore */
  }
}

export function setPaymentOverlayFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SS_PAYMENT, "1");
    window.dispatchEvent(new Event("portal-overlay-sync"));
  } catch {
    /* ignore */
  }
}

export function clearPaymentOverlayFlag(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SS_PAYMENT);
    window.dispatchEvent(new Event("portal-overlay-sync"));
  } catch {
    /* ignore */
  }
}
