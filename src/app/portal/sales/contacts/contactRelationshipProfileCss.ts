export const contactRelationshipProfileCss = `
.contact-rel-profile {
  display: grid;
  gap: 12px;
  max-width: 920px;
}

.contact-rel-hero {
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  border-radius: 14px;
  padding: 14px 16px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--brand-600) 7%, var(--surface)), var(--surface));
}

.contact-rel-hero__back {
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 8px;
}

.contact-rel-hero__back.sales-cmd-mobile-chrome {
  margin: 0 0 8px;
  padding: 0;
  border-bottom: none;
  background: transparent;
}

.contact-rel-hero__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.contact-rel-hero__name {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.contact-rel-hero__meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--muted);
  line-height: 1.45;
}

.contact-rel-hero__reach {
  margin: 4px 0 0;
  font-size: 12px;
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.contact-rel-hero__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.contact-rel-hero__actions > a,
.contact-rel-hero__actions > button {
  font-size: 12px;
  padding: 7px 10px;
  min-height: 34px;
  border-radius: 9px;
}

.contact-rel-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.contact-rel-chip {
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 700;
  background: color-mix(in srgb, var(--foreground) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.contact-rel-chip--brand {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  color: var(--brand-700);
}

.contact-rel-chip--warn {
  border-color: color-mix(in srgb, var(--danger) 35%, var(--border));
  color: var(--danger);
}

.contact-rel-card {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  padding: 12px 14px;
  background: var(--surface);
}

.contact-rel-card--primary {
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.contact-rel-card__kicker {
  margin: 0 0 4px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: color-mix(in srgb, var(--brand-700) 65%, var(--muted));
}

.contact-rel-card__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 800;
}

.contact-rel-card__body {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
}

.contact-rel-influence-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.contact-rel-influence {
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
}

.contact-rel-influence--on {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  color: var(--brand-700);
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
}

.contact-rel-influence--off {
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  color: var(--muted);
  border: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.contact-rel-missing {
  margin: 10px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, #f59e0b 8%, var(--surface));
  border: 1px solid color-mix(in srgb, #f59e0b 22%, var(--border));
  font-size: 12px;
  line-height: 1.45;
}

.contact-rel-missing strong {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.contact-rel-org-list,
.contact-rel-provider-list {
  display: grid;
  gap: 6px;
}

.contact-rel-org-row,
.contact-rel-provider-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 9px;
  border: 1px solid color-mix(in srgb, var(--foreground) 7%, var(--border));
  font-size: 13px;
}

.contact-rel-org-row__name,
.contact-rel-provider-row__name {
  font-weight: 800;
}

.contact-rel-org-row__detail,
.contact-rel-provider-row__detail {
  font-size: 11px;
  color: var(--muted);
  margin-top: 2px;
}

.contact-rel-provider-row__actions {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.contact-rel-collapse {
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 12px;
  overflow: hidden;
}

.contact-rel-collapse > summary {
  list-style: none;
  cursor: pointer;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 800;
  background: color-mix(in srgb, var(--foreground) 3%, var(--surface));
}

.contact-rel-collapse > summary::-webkit-details-marker {
  display: none;
}

.contact-rel-collapse__body {
  padding: 10px 14px 12px;
  display: grid;
  gap: 10px;
}

.contact-rel-subhead {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.contact-rel-activity-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  font-size: 12px;
}

.contact-rel-activity-row:last-child {
  border-bottom: none;
}

@media (max-width: 640px) {
  .contact-rel-hero__actions {
    width: 100%;
  }

  .contact-rel-hero__actions > a,
  .contact-rel-hero__actions > button {
    flex: 1 1 calc(50% - 3px);
    justify-content: center;
  }

  .contact-rel-provider-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
`;
