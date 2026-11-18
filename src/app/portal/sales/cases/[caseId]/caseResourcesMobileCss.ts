export const caseResourcesMobileCss = `
.case-resources-mobile {
  display: grid;
  gap: 0;
  background: #fff;
  min-width: 0;
}
.case-mobile-panel > .case-resources-mobile {
  border-radius: 0;
}
.case-resources-mobile-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-resources-mobile-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-resources-mobile-upload {
  flex: 0 0 auto;
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  -webkit-appearance: none;
}
.case-resources-mobile-upload:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.case-resources-mobile-phi {
  margin: 0;
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  background: color-mix(in srgb, #ca8a04 6%, #fff);
  border-bottom: 1px solid color-mix(in srgb, #ca8a04 18%, var(--border));
}
.case-resources-mobile-body {
  display: grid;
  gap: 0;
  padding: 0;
}
.case-resources-section {
  border: none;
  border-radius: 0;
  background: #fff;
  overflow: hidden;
  min-width: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-resources-section:last-child {
  border-bottom: none;
}
.case-resources-section-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: #fff;
}
.case-resources-section-head--no-action {
  grid-template-columns: minmax(0, 1fr) auto;
}
.case-resources-section-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--foreground);
  min-width: 0;
}
.case-resources-section-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 5%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}
.case-resources-section-action {
  padding: 4px 8px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--foreground);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  appearance: none;
  -webkit-appearance: none;
}
.case-resources-section-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.case-resources-section-body {
  padding: 0;
  min-width: 0;
}
.case-resources-empty {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.4;
}
.case-resources-info-banner {
  margin: 0;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 90%, var(--muted));
}
.case-res-doc-list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.case-res-doc-row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  padding: 9px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  min-width: 0;
}
.case-res-doc-row:last-child {
  border-bottom: none;
}
.case-res-doc-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 900;
  flex-shrink: 0;
}
.case-res-doc-main {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.case-res-doc-name {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.case-res-doc-type {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.case-res-doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.35;
}
.case-res-doc-menu-wrap {
  position: relative;
  flex-shrink: 0;
}
.case-res-doc-menu-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
  cursor: pointer;
  touch-action: manipulation;
}
.case-res-doc-menu-panel {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 20;
  min-width: 120px;
  margin-top: 2px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--foreground) 12%, transparent);
}
.case-res-doc-menu-item {
  display: block;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
}
.case-res-doc-menu-item--danger {
  color: var(--danger);
}
.case-res-product-row {
  padding: 9px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  display: grid;
  gap: 6px;
  min-width: 0;
}
.case-res-product-row:last-child {
  border-bottom: none;
}
.case-res-product-title {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
}
.case-res-product-sku {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}
.case-res-product-qty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.case-res-product-qty label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--muted);
}
.case-res-product-qty input {
  width: 56px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 12px;
  font-weight: 700;
}
.case-res-product-save {
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: var(--brand-600);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.case-res-billing-check {
  display: grid;
  gap: 0;
}
.case-res-billing-check-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  font-size: 12px;
  font-weight: 650;
}
.case-res-billing-check-row:last-child {
  border-bottom: none;
}
.case-res-billing-status {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-res-billing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
}
.case-res-billing-actions button {
  padding: 5px 9px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}
.case-res-billing-actions button.case-res-billing-actions-primary {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}
.case-res-revenue-rows {
  padding: 4px 10px 8px;
  display: grid;
  gap: 6px;
}
.case-res-revenue-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 11px;
}
.case-res-revenue-row span:first-child {
  color: var(--muted);
  font-weight: 600;
}
.case-res-revenue-row span:last-child {
  font-weight: 800;
}
.case-res-linked-copy {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.45;
}
.case-res-linked-actions {
  padding: 0 10px 10px;
}
.case-res-linked-actions a,
.case-res-linked-actions button {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
  text-decoration: none;
}
@media (min-width: 641px) {
  .case-resources-mobile {
    display: none;
  }
}
`;
