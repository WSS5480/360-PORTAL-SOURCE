/**
 * Partner intake uses the same inventory gate as order confirm.
 *
 * Portal confirm and admin confirm both refuse to move an order to CONFIRMED
 * when on-hand quantity is short (demo accounts are the existing exception).
 * Lock is the only step that decrements inventory, and lock accepts only
 * CONFIRMED orders. Fulfillment start accepts LOCKED and later statuses.
 * There is no backorder or inventory-review status.
 *
 * A short-stock partner order therefore cannot be retained as CONFIRMED
 * without skipping the confirm gate. Retaining it as DRAFT would leave an
 * approved partner order editable in the portal, which confirm does not allow
 * once an order is CONFIRMED. Partner intake rejects the shortage and does
 * not insert an order. A later stock drop after accept still leaves the
 * existing CONFIRMED order in place; lock fails closed and staff review it
 * from the orders screen.
 */
export const PARTNER_INVENTORY_LIMITATION =
  "Insufficient inventory is rejected. Confirmed partner orders are not held for backorder, and no inventory is decremented until staff lock the order.";
