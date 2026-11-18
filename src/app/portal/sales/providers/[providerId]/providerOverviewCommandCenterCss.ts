/** Provider overview — calm executive deployment layout */
export const providerOverviewCommandCenterCss = `
.pov--mobile-first {
  --pov-sticky-action-h: 52px;
  --pov-section-gap: 20px;
  --pov-card-radius: 14px;
  --pov-card-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 20px rgba(15, 23, 42, 0.05);
  --pov-page-bg: #f4f6f9;
  --pov-card-bg: #fff;
  --pov-surface-muted: color-mix(in srgb, var(--foreground) 2.5%, #f4f6f9);
  min-width: 0;
  padding: 8px 0 calc(var(--pov-sticky-action-h) + 72px + env(safe-area-inset-bottom, 0px) + 20px);
}

.provider-cc--dashboard {
  min-width: 0;
}

.pov-hero {
  margin-bottom: var(--pov-section-gap);
}

.pov-stack {
  display: flex;
  flex-direction: column;
  gap: var(--pov-section-gap);
}

.pov-section--priorities {
  min-width: 0;
}

.pov-section--notes {
  min-width: 0;
}

/* Operational summary — primary focal card */
.pov-sticky-summary {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 18px 18px 20px;
  border-radius: var(--pov-card-radius);
  background: var(--pov-card-bg);
  box-shadow: var(--pov-card-shadow);
  border: none;
}

.pov-sticky-kicker {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 42%, transparent);
}

.pov-sticky-verdict {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.2;
}

.pov-sticky-verdict--deploy {
  color: #15803d;
}

.pov-sticky-verdict--hold {
  color: #c2410c;
}

.pov-sticky-verdict--caution {
  color: #b45309;
}

.pov-sticky-line {
  margin: 10px 0 0;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Priority feed — guidance cards */
.pov-guidance-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pov-guidance-card {
  padding: 14px 16px 13px;
  border-radius: var(--pov-card-radius);
  background: var(--pov-card-bg);
  box-shadow: var(--pov-card-shadow);
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pov-guidance-feed-item {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.pov-guidance-card--blocker {
  border-color: color-mix(in srgb, #c2410c 22%, var(--border));
  background: color-mix(in srgb, #c2410c 3%, #fff);
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
}

.pov-guidance-card--next_move {
  border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

/* Resolution path — tied to blocker + primary CTA */
.pov-resolution {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pov-resolution--feed {
  margin-top: 0;
  padding: 14px 16px 16px;
  border-radius: 0 0 var(--pov-card-radius) var(--pov-card-radius);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  border-top: 1px dashed color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  box-shadow: var(--pov-card-shadow);
}

.pov-resolution--feed:not(:first-child) {
  border-radius: var(--pov-card-radius);
  border-top: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  margin-top: 10px;
}

.pov-resolution-clears {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.35;
  color: color-mix(in srgb, #c2410c 75%, var(--foreground));
}

.pov-resolution-label {
  font-weight: 800;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.pov-resolution-move-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pov-resolution-kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pov-resolution-move {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.03em;
  color: var(--foreground);
}

.pov-resolution-why,
.pov-resolution-source {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
}

.pov-resolution-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  margin-top: 4px;
  padding: 0 16px;
  border-radius: 12px;
  background: var(--brand-600);
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  text-decoration: none;
  letter-spacing: -0.02em;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--brand-600) 28%, transparent);
}

.pov-resolution-cta:active {
  background: var(--brand-700);
}

.pov-guidance-eyebrow {
  display: block;
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 45%, transparent);
}

.pov-guidance-card--blocker .pov-guidance-eyebrow {
  color: #c2410c;
}

.pov-guidance-headline {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.03em;
  color: var(--foreground);
}

.pov-guidance-explanation {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pov-guidance-next {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
}

.pov-guidance-next-label {
  font-weight: 800;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  margin-right: 0.25em;
}

.pov-guidance-next-link {
  color: var(--brand-700);
  text-decoration: none;
  letter-spacing: -0.01em;
}

.pov-guidance-next-link:hover {
  text-decoration: underline;
}

.pov-notes-headline {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
}

.pov-notes-explanation {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pov-notes-next {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 78%, transparent);
}

.pov-notes-next-label {
  font-weight: 800;
  margin-right: 0.25em;
}

.pov-scan-row {
  display: grid;
  grid-template-columns: 76px 1fr auto;
  gap: 10px 12px;
  align-items: center;
  min-height: 52px;
  padding: 14px 16px;
  border-radius: var(--pov-card-radius);
  background: var(--pov-card-bg);
  box-shadow: var(--pov-card-shadow);
  border: none;
  text-decoration: none;
  color: inherit;
}

.pov-scan-row--link:active {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pov-scan-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.pov-scan-text {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.02em;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pov-scan-chevron {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-700);
}

/* Dominant next action */
.pov-dominant-action {
  padding: 16px 16px 18px;
  border-radius: var(--pov-card-radius);
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  box-shadow: var(--pov-card-shadow);
  border: none;
}

.pov-dominant-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  width: 100%;
  padding: 0 18px;
  border-radius: 12px;
  background: var(--brand-600);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  text-decoration: none;
  letter-spacing: -0.02em;
  box-shadow: 0 2px 10px color-mix(in srgb, var(--brand-600) 32%, transparent);
}

.pov-dominant-cta:active {
  background: var(--brand-700);
}

.pov-dominant-hint {
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  text-align: center;
  color: color-mix(in srgb, var(--foreground) 52%, transparent);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Fixed bottom CTA — always reachable by thumb */
.pov-sticky-action {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, #fff 94%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.08);
}

.pov-sticky-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--pov-sticky-action-h);
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 12px;
  background: var(--brand-600);
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  text-decoration: none;
  letter-spacing: -0.02em;
}

.pov-sticky-action-btn:active {
  background: var(--brand-700);
}

.pov-sticky-action-copy {
  max-width: 480px;
  margin: 0 auto;
  width: 100%;
}

.pov-sticky-action-move {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: -0.02em;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pov-sticky-action-source {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  color: var(--muted);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pov-sticky-action-source-label {
  font-weight: 800;
}

/* Confirmed so far — compact validated positives */
.pov-confirmed {
  border-radius: var(--pov-card-radius);
  background: color-mix(in srgb, #16a34a 4%, var(--pov-card-bg));
  border: 1px solid color-mix(in srgb, #16a34a 16%, var(--border));
  box-shadow: var(--pov-card-shadow);
  padding: 14px 16px 12px;
}

.pov-confirmed-heading {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, #166534 80%, var(--muted));
}

.pov-confirmed-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pov-confirmed-item {
  position: relative;
  padding-left: 1.15em;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: color-mix(in srgb, var(--foreground) 88%, transparent);
}

.pov-confirmed-item::before {
  content: "✓";
  position: absolute;
  left: 0;
  color: #16a34a;
  font-weight: 800;
  font-size: 12px;
}

/* Latest field intelligence */
.pov-intel-panel {
  border-radius: var(--pov-card-radius);
  background: var(--pov-card-bg);
  box-shadow: var(--pov-card-shadow);
  padding: 18px 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pov-intel-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.pov-intel-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pov-intel-item {
  position: relative;
  padding-left: 14px;
  font-size: 14px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--foreground) 88%, transparent);
  letter-spacing: -0.01em;
}

.pov-intel-item::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--brand-600);
}

.pov-intel-empty {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: var(--muted);
}

.pov-intel-link {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.pov-section--intel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pov-more--nested {
  margin-top: 0;
}

/* Account notes — secondary surface */
.pov-more {
  margin: 0;
  border: none;
  border-radius: var(--pov-card-radius);
  background: var(--pov-card-bg);
  box-shadow: var(--pov-card-shadow);
  overflow: hidden;
}

.pov-more-summary {
  padding: 16px 18px;
  font-size: 15px;
  font-weight: 750;
  letter-spacing: -0.02em;
  cursor: pointer;
  list-style: none;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
}

.pov-more-summary::-webkit-details-marker {
  display: none;
}

.pov-more[open] .pov-more-summary {
  color: var(--foreground);
  background: var(--pov-surface-muted);
}

.pov-more-body {
  padding: 18px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--pov-surface-muted);
}

.pov-more-readiness {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pov-more-readiness-label {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.pov-more-readiness-sub {
  font-size: 13px;
  color: var(--muted);
}

.pov-more-dots {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pov-more-dot {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.pov-more-dot--complete {
  border-color: color-mix(in srgb, var(--brand-600) 25%, var(--border));
  color: var(--brand-800);
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.pov-more-dot--partial {
  border-color: color-mix(in srgb, #f59e0b 35%, var(--border));
  color: #b45309;
}

.pov-more-link {
  font-size: 14px;
  font-weight: 700;
  color: var(--brand-700);
  text-decoration: none;
}

.pov-notes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pov-notes-section {
  border-radius: 12px;
  border: none;
  background: var(--pov-card-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.pov-notes-section-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  list-style: none;
}

.pov-notes-section-summary::-webkit-details-marker {
  display: none;
}

.pov-notes-section[open] .pov-notes-section-summary {
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pov-notes-section-title {
  color: var(--foreground);
}

.pov-notes-section-meta {
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  white-space: nowrap;
}

.pov-notes-section-body {
  padding: 4px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pov-notes-summary {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.pov-notes-block-label {
  display: block;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 4px;
}

.pov-notes-block-list {
  margin: 0;
  padding: 0 0 0 1em;
  list-style: disc;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pov-notes-block-list li {
  font-size: 12px;
  line-height: 1.4;
  color: var(--foreground);
}

.pov-notes-block--open .pov-notes-block-list li {
  color: color-mix(in srgb, #b45309 75%, var(--foreground));
}

.pov-notes-block-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  font-style: italic;
}

.pov-record-nested--flat {
  margin-top: 0;
  border: none;
  border-radius: 12px;
  background: var(--pov-card-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.pov-record {
  border-radius: 12px;
  border: none;
  background: var(--pov-card-bg);
}

.pov-record-summary {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  list-style: none;
}

.pov-record-summary::-webkit-details-marker {
  display: none;
}

.pov-record-body {
  padding: 8px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pov-record-nested {
  border-radius: 12px;
  border: none;
  background: var(--pov-card-bg);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

.pov-record-nested summary {
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.pov-record-meta {
  margin-left: 6px;
  font-weight: 500;
  color: var(--muted);
  font-size: 12px;
}

.pov-record-nested-body {
  padding: 0 12px 12px;
}

.pov-record-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 4px;
}

.pov-record-chip {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 650;
  text-decoration: none;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
  border: none;
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  min-height: 38px;
  display: inline-flex;
  align-items: center;
}

.provider-profile-root--command-center .provider-profile-body {
  padding: 8px 12px calc(20px + env(safe-area-inset-bottom, 0px));
  background: #f4f6f9;
}

.provider-profile-root--command-center .provider-cc--dashboard {
  max-width: 560px;
  margin-inline: auto;
}

/* Desktop — single column, executive pacing */
@media (min-width: 720px) {
  .pov--mobile-first {
    --pov-section-gap: 24px;
    max-width: 560px;
    margin: 0 auto;
    padding: 12px 0 32px;
  }

  .pov-sticky-summary {
    padding: 20px 22px 22px;
  }

  .pov-sticky-action {
    position: static;
    padding: 0;
    margin-top: 12px;
    background: transparent;
    backdrop-filter: none;
    border: none;
    box-shadow: none;
  }

  .pov-sticky-action-btn {
    max-width: none;
  }

  .pov-dominant-action {
    display: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .pov-sticky-summary {
    transition: box-shadow 0.15s ease;
  }
}
`;
