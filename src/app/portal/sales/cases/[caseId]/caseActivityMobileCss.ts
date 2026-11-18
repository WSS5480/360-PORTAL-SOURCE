export const caseActivityMobileCss = `
.case-mobile-only.case-activity-feed-mobile {
  display: grid !important;
  gap: 0;
  background: #fff;
  min-width: 0;
}
.case-activity-feed-mobile {
  display: grid;
  gap: 0;
  background: #fff;
  min-width: 0;
}
.case-mobile-panel > .case-activity-feed-mobile {
  border-radius: 0;
}
.case-activity-feed-head {
  padding: 8px 12px 6px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-activity-feed-kicker {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}
.case-activity-feed-filters {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  padding: 8px 12px;
  scroll-padding-inline: 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  scrollbar-width: none;
  isolation: isolate;
}
.case-activity-feed-filters::-webkit-scrollbar {
  display: none;
}
.case-activity-feed-filter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  flex-shrink: 0;
  width: auto;
  max-width: none;
  min-height: 28px;
  height: auto;
  margin: 0;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  touch-action: manipulation;
  appearance: none;
  -webkit-appearance: none;
  white-space: nowrap;
  box-shadow: none;
  transform: none;
}
.case-activity-feed-filter[aria-pressed="true"] {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}
.case-activity-quick-note {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 7px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}
.case-activity-quick-note-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-600);
  flex-shrink: 0;
}
.case-activity-quick-note-input {
  width: 100%;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--foreground);
  padding: 6px 0;
  outline: none;
}
.case-activity-quick-note-input::placeholder {
  color: var(--muted);
  font-weight: 500;
}
.case-activity-quick-note-submit {
  border: none;
  background: transparent;
  color: var(--brand-600);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 0;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
}
.case-activity-quick-note-submit:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.case-activity-feed-timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  min-width: 0;
}
.case-activity-feed-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  padding: 8px 12px;
  position: relative;
  min-width: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
}
.case-activity-feed-item:last-child {
  border-bottom: none;
}
.case-activity-feed-rail {
  position: absolute;
  left: 25px;
  top: 34px;
  bottom: 0;
  width: 2px;
  background: color-mix(in srgb, var(--foreground) 10%, var(--border));
  pointer-events: none;
}
.case-activity-feed-item:last-child .case-activity-feed-rail {
  display: none;
}
.case-activity-feed-icon {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  flex-shrink: 0;
  margin-top: 2px;
}
.case-activity-feed-icon--notes {
  background: color-mix(in srgb, #0d9488 14%, #fff);
  color: #0f766e;
  border: 1px solid color-mix(in srgb, #0d9488 28%, var(--border));
}
.case-activity-feed-icon--workflow {
  background: color-mix(in srgb, #16a34a 14%, #fff);
  color: #15803d;
  border: 1px solid color-mix(in srgb, #16a34a 28%, var(--border));
}
.case-activity-feed-icon--products {
  background: color-mix(in srgb, #7c3aed 14%, #fff);
  color: #6d28d9;
  border: 1px solid color-mix(in srgb, #7c3aed 28%, var(--border));
}
.case-activity-feed-icon--documents {
  background: color-mix(in srgb, #ea580c 14%, #fff);
  color: #c2410c;
  border: 1px solid color-mix(in srgb, #ea580c 28%, var(--border));
}
.case-activity-feed-icon--system {
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
  color: var(--muted);
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
}
.case-activity-feed-main {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.case-activity-feed-title {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
}
.case-activity-feed-details {
  font-size: 12px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 88%, var(--muted));
  white-space: pre-wrap;
  word-break: break-word;
}
.case-activity-feed-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.case-activity-feed-meta-chip {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  color: var(--muted);
}
.case-activity-feed-foot {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--muted);
  font-weight: 600;
}
.case-activity-feed-foot time {
  font-weight: 700;
}
.case-activity-feed-empty {
  padding: 16px 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  text-align: center;
}
.case-activity-feed-caught-up {
  padding: 14px 12px 16px;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff);
}
.surgical-case-motion .case-activity-feed-filter:hover,
.surgical-case-motion .case-activity-quick-note-submit:hover {
  filter: none;
}
.surgical-case-motion .case-activity-feed-filter:active,
.surgical-case-motion .case-activity-quick-note-submit:active {
  transform: none !important;
  opacity: 0.85;
}
@media (max-width: 640px) {
  .case-activity-feed-mobile {
    overflow: hidden;
  }
  .case-activity-feed-filter {
    min-height: 28px !important;
    max-width: none !important;
    width: auto !important;
  }
}
@media (min-width: 641px) {
  .case-activity-feed-mobile {
    display: none;
  }
}
.case-activity-promote-intel {
  padding: 8px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}
.case-activity-promote-intel-btn {
  width: 100%;
  min-height: 38px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
  color: var(--brand-700);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.case-activity-promote-intel-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
`;
