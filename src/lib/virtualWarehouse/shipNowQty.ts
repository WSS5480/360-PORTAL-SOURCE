/** Units to ship from physical inventory (remainder after virtual-warehouse allocation). */
export function shipNowQtyForLine(it: {
  quantity?: unknown;
  virtual_warehouse_qty?: unknown;
  description?: unknown;
}): number {
  const desc = String((it as any).description ?? "").trim();
  if (desc.startsWith("Virtual warehouse bulk purchase")) {
    return 0;
  }
  const qty = Math.max(0, Math.floor(Number((it as any).quantity) || 0));
  const vw = Math.max(0, Math.floor(Number((it as any).virtual_warehouse_qty ?? 0) || 0));
  return Math.max(0, qty - vw);
}
