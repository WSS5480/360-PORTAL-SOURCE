/** Command-center layout for Provider Detail overview (mobile + desktop). */
export const providerCommandCenterCss = `
.provider-cc {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

/* Provider detail header (sticky + identity) */
.provider-profile-header--briefing {
  padding: 6px 10px 8px;
  background: #fff;
}

.provider-hd {
  min-width: 0;
}

.provider-hd-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.provider-hd-actions {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.provider-hd-actions-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--surface-2) 82%, #fff);
  font-size: 12px;
  font-weight: 750;
  font-family: inherit;
  color: var(--foreground);
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
}

.provider-hd-actions-trigger:hover,
.provider-hd-actions-trigger:focus-visible {
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 7%, #fff);
  outline: none;
}

.provider-hd-actions-trigger--remove {
  border-color: color-mix(in srgb, var(--danger, #dc2626) 28%, var(--border));
  color: color-mix(in srgb, var(--danger, #dc2626) 82%, var(--foreground));
}

.provider-hd-actions-trigger--remove:hover,
.provider-hd-actions-trigger--remove:focus-visible {
  border-color: color-mix(in srgb, var(--danger, #dc2626) 48%, var(--border));
  background: color-mix(in srgb, var(--danger, #dc2626) 8%, #fff);
}

.provider-hd-actions-trigger:disabled {
  opacity: 0.65;
  cursor: wait;
}

.provider-hd-actions-menu {
  min-width: 220px;
}

.provider-act-menu-item--danger {
  color: color-mix(in srgb, var(--danger, #dc2626) 88%, var(--foreground));
}

.provider-act-menu-item--disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.provider-act-menu-item--disabled:hover,
.provider-act-menu-item--disabled:focus-visible {
  background: transparent;
}

.provider-hd-main {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: 1 1 auto;
}

.provider-hd-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
}

.provider-hd-avatar-wrap--compact {
  width: 40px;
  height: 40px;
}

.provider-hd-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 11px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--brand-600) 12%, #fff),
    color-mix(in srgb, var(--foreground) 4%, #fff)
  );
  color: var(--brand-800);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1;
  overflow: hidden;
}

.provider-hd-avatar-wrap--compact .provider-hd-avatar {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 13px;
}

.provider-hd-avatar--img {
  object-fit: cover;
  padding: 0;
  background: #fff;
}

.provider-hd-org-logo {
  position: absolute;
  right: -3px;
  bottom: -3px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.provider-hd-org-logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 2px;
}

.provider-hd-identity {
  flex: 1;
  min-width: 0;
}

.provider-hd-focus-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.provider-hd-focus-chip {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-hd-focus-chip--specialty {
  color: #1e3a5f;
  background: color-mix(in srgb, #3b82f6 8%, #fff);
  border: 1px solid color-mix(in srgb, #3b82f6 18%, var(--border));
}

.provider-hd-focus-chip--procedure {
  color: #3f3f46;
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
}

.provider-hd-focus-chip--muted {
  color: var(--muted);
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
  font-weight: 600;
}

.provider-hd-name {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--foreground);
}

.provider-hd-meta {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0;
}

.provider-hd-meta-part {
  min-width: 0;
}

.provider-hd-meta-sep {
  margin: 0 4px;
}

.provider-hd-meta-muted {
  color: color-mix(in srgb, var(--muted) 85%, transparent);
}

.provider-hd-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 6px;
}

.provider-hd-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.02em;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  color: var(--foreground);
  white-space: nowrap;
}

.provider-hd-badge--stage {
  border-color: color-mix(in srgb, var(--brand-600) 26%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  color: var(--brand-700);
}

.provider-hd-badge--brand {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700);
}

.provider-hd-badge--ok {
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
  background: color-mix(in srgb, #16a34a 7%, #fff);
  color: #166534;
}

.provider-hd-badge--warn {
  border-color: color-mix(in srgb, #d97706 28%, var(--border));
  background: color-mix(in srgb, #d97706 8%, #fff);
  color: #92400e;
}

.provider-hd-touch {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-hd-touch--empty {
  font-style: italic;
}

.provider-hd-touch-link,
.provider-hd-touch-label {
  margin-left: 4px;
  font-weight: 700;
  color: var(--foreground);
}

.provider-hd-touch-link {
  text-decoration: none;
  color: var(--brand-700);
}

.provider-hd-touch-at {
  font-weight: 600;
  color: var(--muted);
}

.provider-hd-strategy {
  margin: 8px 0 0;
  padding: 7px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  font-size: 12px;
  line-height: 1.45;
  color: var(--foreground);
  font-weight: 500;
}

.provider-hd-strategy-next-label {
  font-weight: 700;
  color: var(--muted);
}

.provider-hd-strategy-next {
  font-weight: 900;
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

@media (min-width: 640px) {
  .provider-hd-name {
    font-size: 20px;
  }
}

/* What matters now — under header */
.provider-wmn {
  margin-top: 4px;
  padding: 0 0 6px;
  min-width: 0;
}

.provider-wmn-title {
  margin: 0 0 4px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-wmn-list {
  margin: 0;
  padding: 0 0 0 15px;
  list-style: disc;
}

.provider-wmn-item {
  font-size: 11px;
  line-height: 1.4;
  font-weight: 500;
  color: var(--foreground);
  margin-bottom: 3px;
}

.provider-wmn-item:last-child {
  margin-bottom: 0;
}

.provider-wmn-item--next {
  list-style: none;
  margin-left: -15px;
  padding: 4px 0 0;
  margin-top: 2px;
}

.provider-wmn-next-label {
  font-weight: 700;
  color: var(--muted);
}

.provider-wmn-next-action {
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-wmn-next-action:active {
  filter: brightness(0.92);
}

/* Action row — primary + one secondary + overflow menu */
.provider-act-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  min-width: 0;
}

.provider-act-row--hierarchy {
  gap: 5px;
}

.provider-act-primary-group {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.provider-act-primary-group .provider-act-btn--primary {
  flex: 1 1 auto;
}

.provider-act-primary-group .provider-act-btn--secondary {
  flex: 0 0 auto;
}

.provider-act-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--foreground) 12%, var(--border));
  background: #fff;
  color: var(--foreground);
  box-sizing: border-box;
}

.provider-act-btn--primary {
  background: var(--brand-600);
  color: #fff;
  border-color: var(--brand-600);
  font-weight: 800;
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
}

.provider-act-btn--primary:active {
  filter: brightness(0.95);
}

.provider-act-btn--secondary {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  flex: 0 1 auto;
  min-width: 0;
  font-weight: 700;
}

.provider-act-btn--secondary:active {
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
}

.provider-act-btn--overflow {
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
  border-color: transparent;
  background: transparent;
  flex: 0 0 auto;
  font-weight: 650;
  min-height: 28px;
  padding: 0 8px;
  font-size: 11px;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-act-btn--overflow:hover {
  color: var(--foreground);
  background: color-mix(in srgb, var(--foreground) 4%, transparent);
}

.provider-act-more-wrap {
  position: relative;
  display: flex;
  flex-shrink: 0;
}

.provider-act-more-trigger {
  gap: 3px;
}

.provider-act-more-chevron {
  font-size: 9px;
  line-height: 1;
  opacity: 0.75;
}

.provider-act-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 45;
  min-width: 200px;
  padding: 4px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--foreground) 12%, transparent);
}

.provider-act-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
  text-align: left;
  text-decoration: none;
  color: var(--foreground);
  background: transparent;
  cursor: pointer;
}

.provider-act-menu-item:hover,
.provider-act-menu-item:focus-visible {
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  outline: none;
}

@media (min-width: 640px) {
  .provider-act-row--hierarchy {
    flex-wrap: nowrap;
  }

  .provider-act-btn--primary {
    flex: 0 1 auto;
    min-width: 8.5rem;
  }

  .provider-act-btn--secondary {
    flex: 0 0 auto;
  }
}

/* Section shell */
.provider-cc-section {
  min-width: 0;
}

.provider-cc-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.provider-cc-section-title {
  margin: 0;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-cc-section-link {
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
  flex-shrink: 0;
}

/* 3. Intelligence summary — strategic panel */
.provider-intel-panel {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-intel-overall {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-intel-overall-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-intel-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}

.provider-intel-pill--sm {
  font-size: 9px;
  padding: 1px 6px;
}

.provider-intel-pill--limited {
  color: #92400e;
  background: color-mix(in srgb, #d97706 10%, #fff);
  border-color: color-mix(in srgb, #d97706 28%, var(--border));
}

.provider-intel-pill--building {
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.provider-intel-pill--strong {
  color: #166534;
  background: color-mix(in srgb, #16a34a 8%, #fff);
  border-color: color-mix(in srgb, #16a34a 26%, var(--border));
}

.provider-intel-tracks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-intel-track {
  min-width: 0;
}

.provider-intel-track-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}

.provider-intel-track-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.provider-intel-bar {
  height: 4px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 6%, var(--border));
  overflow: hidden;
}

.provider-intel-bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  min-width: 0;
  transition: width 0.2s ease;
}

.provider-intel-bar-fill--clinical {
  background: var(--brand-600);
}

.provider-intel-bar-fill--relationship {
  background: color-mix(in srgb, #7c3aed 70%, var(--brand-600));
}

.provider-intel-bar-fill--product_competitor {
  background: color-mix(in srgb, #0891b2 75%, var(--brand-600));
}

.provider-intel-track-detail {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  color: var(--muted);
  line-height: 1.3;
}

.provider-intel-missing {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 10px;
  line-height: 1.4;
}

.provider-intel-missing-label {
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  margin-right: 6px;
}

.provider-intel-missing-list {
  color: var(--foreground);
  font-weight: 600;
}

.provider-intel-recommendation {
  margin: 8px 0 0;
  padding: 7px 9px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  border-left: 3px solid var(--brand-600);
}

.provider-intel-captured {
  margin: 6px 0 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.provider-intel-captured-label {
  font-weight: 800;
  color: var(--foreground);
}

.provider-cc-empty {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--muted);
  text-align: center;
  border-radius: 8px;
  background: var(--surface);
  border: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.provider-cc-empty a {
  color: var(--brand-700);
  font-weight: 800;
  text-decoration: none;
}

/* 4. Relationship snapshot */
.provider-rel-panel {
  padding: 8px 10px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-rel-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.provider-rel-hero-tile {
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  min-width: 0;
}

.provider-rel-hero-tile--empty {
  background: var(--surface);
  border-style: dashed;
  border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.provider-rel-hero-k {
  display: block;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-rel-hero-v {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  color: var(--foreground);
}

.provider-rel-hero-empty {
  display: block;
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
}

.provider-rel-coverage {
  margin: 8px 0 0;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.provider-rel-rows {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.provider-rel-row {
  padding: 7px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  min-width: 0;
}

.provider-rel-row:last-child {
  border-bottom: none;
}

.provider-rel-row--empty {
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-rel-row-label {
  display: block;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 3px;
}

.provider-rel-row-value {
  display: block;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--foreground);
  word-break: break-word;
}

.provider-rel-row-empty {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.provider-rel-row-empty-title {
  font-size: 11px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-rel-row-empty-hint {
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  font-style: italic;
}

.provider-rel-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 10px;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 900;
  font-family: inherit;
  cursor: pointer;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.provider-rel-cta:active {
  background: color-mix(in srgb, var(--brand-600) 12%, #fff);
}

@media (max-width: 480px) {
  .provider-rel-hero {
    grid-template-columns: 1fr;
  }
}

/* 5. Engagements preview */
.provider-eng-prev-stat {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.provider-eng-prev-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-eng-prev-card {
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-eng-prev-card-main {
  display: block;
  padding: 8px 10px;
  text-decoration: none;
  color: inherit;
}

.provider-eng-prev-card-main:active {
  background: var(--surface);
}

.provider-eng-prev-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
}

.provider-eng-prev-type {
  font-size: 11px;
  font-weight: 900;
  color: var(--brand-700);
  letter-spacing: 0.01em;
}

.provider-eng-prev-status {
  flex-shrink: 0;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  color: var(--muted);
}

.provider-eng-prev-status--planned {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.provider-eng-prev-status--active {
  color: #1d4ed8;
  border-color: color-mix(in srgb, #3b82f6 24%, var(--border));
  background: color-mix(in srgb, #3b82f6 8%, #fff);
}

.provider-eng-prev-status--done {
  color: #166534;
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, #fff);
}

.provider-eng-prev-title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
  margin-bottom: 2px;
}

.provider-eng-prev-when {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.provider-eng-prev-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
}

.provider-eng-prev-pill {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--foreground) 4%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  color: var(--foreground);
}

.provider-eng-prev-outcome {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--foreground);
  flex: 1;
  min-width: 0;
}

.provider-eng-prev-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px 10px 8px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-eng-prev-link {
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}

.provider-eng-prev-more {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}

.provider-eng-prev-empty {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px dashed color-mix(in srgb, var(--brand-600) 22%, var(--border));
}

.provider-eng-prev-empty-text {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
}

.provider-eng-prev-empty-link {
  color: var(--brand-700);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.provider-eng-prev-empty-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid var(--brand-600);
}

.provider-eng-prev-empty-cta:active {
  filter: brightness(0.95);
}

/* 6. Cases & opportunities pipeline */
.provider-pipe-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
}

.provider-pipe-col {
  min-width: 0;
}

.provider-pipe-col-title {
  margin: 0;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--foreground);
}

.provider-pipe-stat {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.provider-pipe-empty {
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.provider-pipe-empty-text {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
}

.provider-pipe-empty-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 900;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
  border: 1px solid var(--brand-600);
}

.provider-pipe-empty-cta--secondary {
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 24%, var(--border));
}

.provider-pipe-more {
  display: inline-block;
  margin-top: 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}

/* Case preview rows */
.provider-case-prev-list,
.provider-opp-prev-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-case-prev-card,
.provider-opp-prev-card {
  border-radius: 8px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  overflow: hidden;
}

.provider-case-prev-main,
.provider-opp-prev-main {
  display: block;
  padding: 8px 10px;
  text-decoration: none;
  color: inherit;
}

.provider-case-prev-main:active,
.provider-opp-prev-main:active {
  background: var(--surface);
}

.provider-case-prev-top,
.provider-opp-prev-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 3px;
}

.provider-case-prev-type {
  font-size: 9px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  color: var(--foreground);
}

.provider-case-prev-type--obs {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.provider-case-prev-type--support {
  color: #1d4ed8;
  border-color: color-mix(in srgb, #3b82f6 22%, var(--border));
}

.provider-case-prev-status {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
}

.provider-case-prev-status--active {
  color: #1d4ed8;
  border-color: color-mix(in srgb, #3b82f6 24%, var(--border));
}

.provider-case-prev-status--done {
  color: #166534;
  border-color: color-mix(in srgb, #16a34a 24%, var(--border));
}

.provider-case-prev-title {
  display: block;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
}

.provider-case-prev-meta {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.35;
}

.provider-case-prev-links {
  padding: 5px 10px 7px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 5%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, var(--surface));
}

.provider-case-prev-link {
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
}

/* Provider case learning timeline */
.provider-case-timeline-header {
  display: grid;
  gap: 4px;
}

.provider-case-timeline-intro {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--muted);
}

.provider-case-timeline {
  list-style: none;
  margin: 12px 0 0;
  padding: 0 0 0 14px;
  display: grid;
  gap: 0;
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
}

.provider-case-timeline-item {
  position: relative;
  padding: 0 0 18px 16px;
}

.provider-case-timeline-item:last-child {
  padding-bottom: 0;
}

.provider-case-timeline-item::before {
  content: "";
  position: absolute;
  left: -21px;
  top: 14px;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid color-mix(in srgb, var(--brand-600) 42%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.provider-case-timeline-link {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: #fff;
  text-decoration: none;
  color: inherit;
  min-width: 0;
  touch-action: manipulation;
}

.provider-case-timeline-link:active {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.provider-case-timeline-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.provider-case-timeline-type {
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: var(--surface);
}

.provider-case-timeline-type--observation {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.provider-case-timeline-type--support {
  color: #1d4ed8;
  border-color: color-mix(in srgb, #3b82f6 22%, var(--border));
  background: color-mix(in srgb, #3b82f6 6%, #fff);
}

.provider-case-timeline-date {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
  white-space: nowrap;
}

.provider-case-timeline-procedure {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--foreground);
  word-break: break-word;
}

.provider-case-timeline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.provider-case-timeline-meta-item {
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
  font-size: 12px;
  line-height: 1.35;
}

.provider-case-timeline-meta-label {
  font-weight: 800;
  color: var(--muted);
}

.provider-case-timeline-meta-value {
  font-weight: 750;
  color: var(--foreground);
}

.provider-case-timeline-outcome {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 10%, var(--border));
}

.provider-case-timeline-outcome-label,
.provider-case-timeline-questions-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.provider-case-timeline-outcome-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 3px;
}

.provider-case-timeline-outcome-list li {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--foreground);
}

.provider-case-timeline-questions {
  display: flex;
  gap: 6px;
  align-items: baseline;
  margin: 0;
  font-size: 12px;
}

.provider-case-timeline-questions-value {
  font-weight: 900;
  color: #b45309;
}

.provider-longitudinal-panel {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.provider-longitudinal-panel--empty {
  background: var(--surface);
}

.provider-longitudinal-head {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}

.provider-longitudinal-title {
  margin: 0;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.provider-longitudinal-intro {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--muted);
}

.provider-longitudinal-grid {
  display: grid;
  gap: 12px;
}

@media (min-width: 900px) {
  .provider-longitudinal-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.provider-longitudinal-section {
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.provider-longitudinal-section-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand-700);
}

.provider-longitudinal-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 6px;
}

.provider-longitudinal-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.provider-longitudinal-item-text {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-longitudinal-item-count {
  font-size: 10px;
  font-weight: 800;
  color: var(--brand-700);
  white-space: nowrap;
}

.provider-longitudinal-empty {
  margin: 0;
  font-size: 12px;
  color: var(--muted);
}

/* Opportunity preview rows */
.provider-opp-prev-product {
  font-size: 11px;
  font-weight: 900;
  color: var(--brand-700);
  min-width: 0;
}

.provider-opp-prev-stage {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  color: var(--muted);
}

.provider-opp-prev-next {
  display: block;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 600;
  color: var(--foreground);
}

.provider-opp-prev-next-label {
  font-weight: 800;
  color: var(--muted);
}

.provider-opp-prev-next--empty {
  font-size: 10px;
  font-style: italic;
  color: var(--muted);
  font-weight: 500;
}

.provider-opp-prev-links-meta {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

/* 7. Activity preview — operational timeline */
.provider-act-prev-loading {
  margin: 0;
  font-size: 11px;
  color: var(--muted);
}

.provider-act-prev-empty {
  padding: 9px 10px;
  border-radius: 8px;
  background: var(--surface);
  border: 1px dashed color-mix(in srgb, var(--foreground) 14%, var(--border));
}

.provider-act-prev-empty-text {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--foreground);
}

.provider-act-prev-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
}

.provider-act-prev-empty-link {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
  cursor: pointer;
}

.provider-act-prev-list {
  margin: 0;
  padding: 0 0 0 10px;
  list-style: none;
  border-left: 2px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  display: flex;
  flex-direction: column;
  gap: 0;
}

.provider-act-prev-item {
  position: relative;
  margin: 0;
  padding: 0;
}

.provider-act-prev-item::before {
  content: "";
  position: absolute;
  left: -15px;
  top: 12px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid var(--brand-600);
  box-sizing: border-box;
}

.provider-act-prev-item:last-child .provider-act-prev-link {
  padding-bottom: 2px;
}

.provider-act-prev-link {
  display: block;
  padding: 7px 0 9px 6px;
  text-decoration: none;
  color: inherit;
}

.provider-act-prev-link:active {
  opacity: 0.85;
}

.provider-act-prev-row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 3px;
}

.provider-act-prev-kind {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: var(--surface);
  color: var(--muted);
}

.provider-act-prev-kind--note {
  color: #1d4ed8;
  border-color: color-mix(in srgb, #3b82f6 22%, var(--border));
  background: color-mix(in srgb, #3b82f6 6%, #fff);
}

.provider-act-prev-kind--engagement {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.provider-act-prev-kind--case {
  color: #0f766e;
  border-color: color-mix(in srgb, #14b8a6 22%, var(--border));
}

.provider-act-prev-kind--opportunity {
  color: #7c3aed;
  border-color: color-mix(in srgb, #8b5cf6 22%, var(--border));
}

.provider-act-prev-kind--intelligence {
  color: #b45309;
  border-color: color-mix(in srgb, #f59e0b 28%, var(--border));
  background: color-mix(in srgb, #f59e0b 8%, #fff);
}

.provider-act-prev-kind--product {
  color: #5b21b6;
  border-color: color-mix(in srgb, #7c3aed 22%, var(--border));
  background: color-mix(in srgb, #7c3aed 8%, #fff);
}

.provider-act-prev-next {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  color: color-mix(in srgb, var(--brand-600) 72%, var(--muted));
}

.provider-act-prev-time {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.provider-act-prev-headline {
  display: block;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
  color: var(--foreground);
}

.provider-act-prev-detail {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--muted);
}

.provider-act-prev-actor {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: var(--muted);
}

.provider-cc-details {
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: var(--surface);
}

.provider-cc-details summary {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  cursor: pointer;
  list-style: none;
}

.provider-cc-details summary::-webkit-details-marker {
  display: none;
}

.provider-cc-details-body {
  padding: 0 10px 10px;
  font-size: 12px;
  line-height: 1.45;
}

.provider-cc-details-facts {
  display: grid;
  gap: 4px;
}

.provider-cc-details-fact span {
  color: var(--muted);
  font-weight: 700;
}

.provider-cc-details-crm {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.provider-cc-details-crm label {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
}

.provider-cc-details-crm select {
  flex: 1;
  min-width: 140px;
  max-width: 200px;
  min-height: 30px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 12px;
  font-family: inherit;
  background: #fff;
}

@media (min-width: 640px) {
  .provider-cc-briefing-name {
    font-size: 22px;
  }

  .provider-pipe-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 769px) {
  .provider-cc {
    gap: 12px;
  }
}

.provider-profile-root--command-center .provider-profile-sticky {
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
}

.provider-profile-root--command-center .provider-profile-header--overview-chrome {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 12px;
  padding: 6px 12px 4px;
  background: #fff;
}

.provider-profile-root--command-center .provider-profile-header--overview-chrome .provider-profile-back {
  margin-bottom: 0;
}

.provider-profile-overview-chrome {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}

.provider-profile-overview-chrome__actions {
  margin-left: auto;
}

.provider-profile-root--command-center .provider-profile-body {
  padding-top: 4px;
}
`;
