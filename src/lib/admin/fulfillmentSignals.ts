/** Shared fulfillment → timeline signal helpers (admin order + fulfillment pages). */

function safeStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function safeUpper(v: any) {
  return String(v ?? "").toUpperCase();
}

export function extractInventoryShipping(f: any) {
  const meta = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
  const ship = meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {};

  const carrier = safeStr(ship?.carrier) || "";
  const tracking = safeStr(ship?.tracking_number) || safeStr(f?.tracking_number) || "";
  const labelUrl = safeStr(ship?.label_url) || "";
  const shippedAt = ship?.shipped_at
    ? String(ship.shipped_at)
    : f?.shipped_at
      ? String(f.shipped_at)
      : null;
  const noTracking = !!ship?.no_tracking;

  const packingSlipPath =
    safeStr(meta?.packing_slip_path) ||
    safeStr(meta?.docs?.packing_slip?.path) ||
    safeStr(meta?.packing_slip?.path) ||
    "";

  return { carrier, tracking, labelUrl, shippedAt, noTracking, packingSlipPath };
}

export function extractDropshipShipping(f: any) {
  const carrier = safeStr(f?.dropship_carrier) || "";
  const tracking = safeStr(f?.dropship_tracking_number) || "";
  const shipDate = safeStr(f?.dropship_ship_date) || "";
  const packingSlipNo = safeStr(f?.dropship_packing_slip_number) || "";
  const dropshipStatus = safeStr(f?.dropship_status) || "";

  const meta = f?.metadata && typeof f.metadata === "object" ? f.metadata : {};
  const poPath =
    safeStr(meta?.dropship_po_path) ||
    safeStr(meta?.docs?.purchase_order?.path) ||
    safeStr(meta?.purchase_order?.path) ||
    "";

  const ship = meta?.shipping && typeof meta.shipping === "object" ? meta.shipping : {};
  const labelUrl = safeStr(ship?.label_url) || "";
  const noTracking = !!ship?.no_tracking;
  const shippedAt = ship?.shipped_at
    ? String(ship.shipped_at)
    : f?.shipped_at
      ? String(f.shipped_at)
      : null;

  return {
    carrier,
    tracking,
    shipDate,
    packingSlipNo,
    dropshipStatus,
    poPath,
    labelUrl,
    noTracking,
    shippedAt,
  };
}

export function fulfillmentSignals(f: any) {
  if (!f) return { packingSlipGenerated: false, shippingInfoSaved: false };
  const source = safeUpper((f as any)?.fulfillment_source);

  if (source === "DROPSHIP") {
    const ds = extractDropshipShipping(f);
    return {
      packingSlipGenerated: !!ds.packingSlipNo || !!ds.poPath,
      shippingInfoSaved:
        !!ds.tracking || !!ds.shipDate || !!ds.labelUrl || !!ds.noTracking || !!ds.shippedAt,
    };
  }

  const inv = extractInventoryShipping(f);
  return {
    packingSlipGenerated: !!inv.packingSlipPath,
    shippingInfoSaved: !!inv.tracking || !!inv.labelUrl || !!inv.noTracking || !!inv.shippedAt,
  };
}
