/** Mobile-native product opportunity list (compact cards, no pipeline bar). */

export const opportunitiesListMobileCss = `
.opp-mobile-list-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.opp-mobile-list-body {
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
}

.opp-mobile-search-wrap {
  padding: 0 12px 8px;
}

.opp-mobile-search {
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 14px;
  font-family: inherit;
}

.opp-mobile-segments {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 12px 10px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.opp-mobile-segments::-webkit-scrollbar {
  display: none;
}

.opp-mobile-segment {
  flex: 0 0 auto;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  font-size: 12px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.opp-mobile-segment--active {
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
  color: var(--brand-700);
}

.opp-mobile-card-list {
  display: grid;
  gap: 0;
}

.opp-mobile-card {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: var(--surface);
}

.opp-mobile-card-main {
  display: grid;
  gap: 8px;
  padding: 12px 12px 8px;
  text-decoration: none;
  color: inherit;
  min-width: 0;
}

.opp-mobile-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.opp-mobile-card-title-block {
  min-width: 0;
  flex: 1;
}

.opp-mobile-card-provider {
  font-size: 15px;
  font-weight: 850;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.opp-mobile-card-org {
  margin-top: 3px;
  font-size: 12px;
  font-weight: 650;
  color: var(--muted);
  line-height: 1.3;
}

.opp-mobile-card-stage {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  white-space: nowrap;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opp-mobile-card-product {
  font-size: 12px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.opp-mobile-card-next {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
}

.opp-mobile-card-next-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.opp-mobile-card-next-value {
  font-size: 12px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.opp-mobile-card-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 650;
}

.opp-mobile-card-metrics strong {
  color: var(--foreground);
  font-weight: 800;
}

.opp-mobile-card-activity {
  margin-left: auto;
}

.opp-mobile-card-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 0 12px 12px;
}

.opp-mobile-card-action {
  min-height: 36px;
  padding: 0 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
  touch-action: manipulation;
}

.opp-mobile-card-action--accent {
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  color: var(--brand-700);
}

.opp-mobile-empty,
.opp-mobile-empty-block {
  padding: 24px 16px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.45;
}

.opp-mobile-empty-block {
  display: grid;
  gap: 12px;
  justify-items: center;
}

@media (min-width: 769px) {
  .opp-mobile-only {
    display: none !important;
  }
}

@media (max-width: 768px) {
  .opps-desktop-only {
    display: none !important;
  }
}
`;
