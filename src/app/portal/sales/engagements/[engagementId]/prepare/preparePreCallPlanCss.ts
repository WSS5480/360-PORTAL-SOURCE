/** Planned prepare route — provider-overview visual language (dark command + white planning surface). */
export const preparePreCallPlanCss = `
.prepare-for-meeting-page--precall-plan {
  --pfm-pad-x: clamp(12px, 2.4vw, 20px);
  --pfm-read-max: 1120px;
  --pfm-footer-h: calc(60px + env(safe-area-inset-bottom, 0px));
  --pfm-page-bg: #dfe5ed;
  --pfm-surface: #ffffff;
  --pfm-border: #c9d2df;
  --pfm-ink: #0b1220;
  --pfm-ink-soft: #334155;
  --pfm-meta: #64748b;
  --pfm-hero-bg: linear-gradient(152deg, #0a0f1a 0%, #0f172a 42%, #162033 100%);
  --pfm-hero-accent: #0d9488;
  --pfm-elev-hero: 0 14px 44px rgba(15, 23, 42, 0.16);
  --pfm-elev-surface: 0 6px 24px rgba(15, 23, 42, 0.06);
  min-height: 100%;
  background: var(--pfm-page-bg);
  padding-bottom: var(--pfm-footer-h);
  color: var(--pfm-ink-soft);
}

/* —— Dark command header —— */
.pfm-precall-command {
  position: relative;
  isolation: isolate;
  box-shadow: var(--pfm-elev-hero);
}

.pfm-precall-command::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 70% 55% at 88% -10%, color-mix(in srgb, var(--pfm-hero-accent) 22%, transparent), transparent 58%),
    radial-gradient(ellipse 45% 40% at 4% 100%, color-mix(in srgb, var(--pfm-hero-accent) 10%, transparent), transparent 52%);
  z-index: 0;
}

.pfm-precall-command__surface {
  position: relative;
  z-index: 1;
  background: var(--pfm-hero-bg);
  color: #f8fafc;
  padding: 10px var(--pfm-pad-x) 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pfm-precall-command__top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pfm-precall-command__menu {
  color: #e2e8f0 !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
}

.pfm-precall-command__back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(226, 232, 240, 0.92);
  text-decoration: none;
}

.pfm-precall-command__back:hover {
  color: #fff;
}

.pfm-precall-command__hero {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.pfm-precall-command__kicker {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.95);
}

.pfm-precall-command__provider {
  margin: 0;
  font-size: clamp(20px, 4.2vw, 26px);
  font-weight: 800;
  line-height: 1.12;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.pfm-precall-command__org {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(226, 232, 240, 0.88);
}

.pfm-precall-command__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 4px;
}

.pfm-precall-command__type {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  background: color-mix(in srgb, var(--pfm-hero-accent) 72%, rgba(15, 23, 42, 0.9));
  border: 1px solid color-mix(in srgb, var(--pfm-hero-accent) 55%, rgba(255, 255, 255, 0.2));
}

.pfm-precall-command__chip,
.pfm-precall-command__when {
  font-size: 12px;
  font-weight: 700;
  color: #cbd5e1;
}

.pfm-precall-command__chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* —— Main planning canvas —— */
.pfm-precall-main {
  padding: 12px var(--pfm-pad-x) 20px;
}

.pfm-precall-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: var(--pfm-read-max);
  margin: 0 auto;
  width: 100%;
}

@media (max-width: 640px) {
  .pfm-precall-main {
    padding: 10px var(--pfm-pad-x) calc(16px + env(safe-area-inset-bottom, 0px));
  }

  .pfm-precall-layout {
    gap: 10px;
  }

  .pfm-precall-plan-grid {
    padding: 0 10px 12px;
  }
}

.pfm-precall-alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #991b1b;
  background: color-mix(in srgb, #fecaca 55%, #fff);
  border: 1px solid color-mix(in srgb, #dc2626 28%, var(--pfm-border));
}

.pfm-precall-ready {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 0;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #0f766e;
  background: color-mix(in srgb, #14b8a6 10%, #fff);
  border: 1px solid color-mix(in srgb, #0d9488 22%, var(--pfm-border));
}

.pfm-precall-ready__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0d9488;
  flex-shrink: 0;
}

.pfm-precall-ready__when {
  font-weight: 600;
  color: var(--pfm-meta);
}

/* —— White planning surface —— */
.pfm-precall-workspace {
  min-width: 0;
}

.pfm-precall-planning-surface {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, #0f172a 10%, var(--pfm-border));
  background: var(--pfm-surface);
  box-shadow: var(--pfm-elev-surface);
  overflow: hidden;
}

/* —— Plan panel header —— */
.pfm-precall-plan-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pfm-precall-plan-panel__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px 16px;
  padding: 14px 16px 12px;
  border-top: 1px solid color-mix(in srgb, var(--pfm-border) 80%, transparent);
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
}

.pfm-precall-plan-panel__kicker {
  margin: 0 0 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--pfm-meta);
}

.pfm-precall-plan-panel__title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--pfm-ink);
}

/* —— Plan completion guidance —— */
.pfm-precall-completion {
  flex: 1 1 200px;
  max-width: 360px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--pfm-hero-accent) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--pfm-hero-accent) 14%, var(--pfm-border));
}

.pfm-precall-completion__summary {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--pfm-meta);
}

.pfm-precall-completion__label {
  font-weight: 700;
  color: var(--pfm-ink-soft);
}

.pfm-precall-completion__count {
  font-weight: 800;
  color: var(--pfm-ink);
}

.pfm-precall-completion__saving {
  font-weight: 600;
  color: var(--pfm-hero-accent);
}

.pfm-precall-completion__missing {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: color-mix(in srgb, var(--pfm-ink) 48%, var(--pfm-meta));
}

.pfm-precall-completion__missing-label {
  font-weight: 700;
}

@media (max-width: 640px) {
  .pfm-precall-completion {
    flex: 1 1 100%;
    max-width: none;
  }
}

/* —— Field grid —— */
.pfm-precall-plan-grid {
  display: grid;
  gap: 10px;
  padding: 0 12px 14px;
  min-width: 0;
}

.pfm-precall-plan-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

@media (min-width: 900px) {
  .pfm-precall-plan-grid--two-col {
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 0 14px 16px;
  }
}

@media (max-width: 899px) {
  .pfm-precall-plan-grid--two-col {
    grid-template-columns: 1fr;
  }

  .pfm-precall-plan-grid--two-col .pfm-precall-plan-col--right,
  .pfm-precall-plan-grid--two-col .pfm-precall-plan-col--left {
    display: contents;
  }

  .pfm-precall-plan-grid--two-col {
    display: flex;
    flex-direction: column;
  }
}

/* —— Field cards —— */
.pfm-precall-field-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--pfm-ink) 7%, var(--pfm-border));
  background: #fff;
  min-width: 0;
}

.pfm-precall-field-card__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pfm-precall-field-card__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pfm-precall-field-card__menu-wrap {
  position: relative;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.pfm-precall-field-card:hover .pfm-precall-field-card__menu-wrap,
.pfm-precall-field-card:focus-within .pfm-precall-field-card__menu-wrap,
.pfm-precall-field-card__menu-wrap--open {
  opacity: 1;
}

@media (hover: none) {
  .pfm-precall-field-card__menu-wrap {
    opacity: 0.5;
  }

  .pfm-precall-field-card__menu-wrap--open {
    opacity: 1;
  }
}

.pfm-precall-field-card__menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: -8px -8px -8px 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 18px;
  line-height: 1;
  font-weight: 700;
  color: var(--pfm-meta);
  cursor: pointer;
}

.pfm-precall-field-card__menu-trigger:hover:not(:disabled) {
  background: color-mix(in srgb, var(--pfm-ink) 5%, #fff);
  color: var(--pfm-ink);
}

.pfm-precall-field-card__menu-trigger:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pfm-precall-field-card__menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 8;
  min-width: 168px;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid var(--pfm-border);
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.pfm-precall-field-card__menu-item {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  text-align: left;
  color: var(--pfm-ink);
  cursor: pointer;
}

.pfm-precall-field-card__menu-item:hover:not(:disabled) {
  background: color-mix(in srgb, var(--pfm-hero-accent) 8%, #fff);
}

.pfm-precall-field-card__menu-item:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pfm-precall-field-card__menu-item--muted {
  color: var(--pfm-meta);
}

.pfm-precall-field-card__label {
  display: block;
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pfm-ink-soft);
}

.pfm-precall-field-card__helper {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--pfm-meta);
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pfm-precall-field-card__input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--pfm-ink) 9%, var(--pfm-border));
  font-size: 14px;
  font-family: inherit;
  line-height: 1.45;
  color: var(--pfm-ink);
  background: #fff;
  resize: vertical;
  max-height: 200px;
}

.pfm-precall-field-card__input::placeholder {
  color: color-mix(in srgb, var(--pfm-meta) 75%, #fff);
}

.pfm-precall-field-card__input:focus {
  outline: 2px solid color-mix(in srgb, var(--pfm-hero-accent) 35%, transparent);
  outline-offset: 1px;
  border-color: color-mix(in srgb, var(--pfm-hero-accent) 45%, var(--pfm-border));
}

.pfm-precall-field-card__input:disabled {
  opacity: 0.65;
  background: #f8fafc;
}

/* —— Provider context (secondary) —— */
.pfm-precall-provider-context {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--pfm-border) 90%, transparent);
  background: color-mix(in srgb, var(--pfm-surface) 88%, var(--pfm-page-bg));
  overflow: hidden;
}

.pfm-precall-provider-context__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--pfm-meta);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.pfm-precall-provider-context__summary::-webkit-details-marker {
  display: none;
}

.pfm-precall-provider-context__summary::after {
  content: "▸";
  font-size: 11px;
  color: var(--pfm-meta);
  transition: transform 0.15s ease;
}

.pfm-precall-provider-context--open .pfm-precall-provider-context__summary::after,
.pfm-precall-provider-context[open] .pfm-precall-provider-context__summary::after {
  transform: rotate(90deg);
}

.pfm-precall-provider-context__body {
  padding: 0 12px 12px;
  border-top: 1px solid color-mix(in srgb, var(--pfm-border) 70%, transparent);
}

.pfm-precall-provider-context__list {
  display: grid;
  gap: 8px;
  margin: 10px 0 0;
  padding: 0;
}

.pfm-precall-provider-context__row {
  display: grid;
  grid-template-columns: minmax(108px, 34%) 1fr;
  gap: 8px 12px;
  margin: 0;
}

.pfm-precall-provider-context__label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--pfm-meta);
}

.pfm-precall-provider-context__value {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--pfm-ink-soft);
}

.pfm-precall-provider-context__link {
  font-weight: 700;
  color: #0f766e;
  text-decoration: none;
}

.pfm-precall-provider-context__link:hover {
  text-decoration: underline;
}

.pfm-precall-provider-context__empty {
  color: var(--pfm-meta);
}

.pfm-precall-provider-context__activity {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed color-mix(in srgb, var(--pfm-border) 65%, transparent);
}

.pfm-precall-provider-context__activity-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--pfm-meta);
}

.pfm-precall-provider-context__activity-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.pfm-precall-provider-context__activity-row {
  display: grid;
  align-content: center;
  gap: 2px;
  min-height: 44px;
  font-size: 12px;
  line-height: 1.4;
  color: inherit;
  text-decoration: none;
}

.pfm-precall-provider-context__activity-title {
  font-weight: 700;
  color: var(--pfm-ink);
}

.pfm-precall-provider-context__activity-meta {
  font-size: 11px;
  color: var(--pfm-meta);
}

.pfm-precall-provider-context__profile-link {
  margin: 4px 0 0;
  font-size: 11px;
}

.pfm-precall-provider-context__profile-link a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-weight: 700;
  color: #0f766e;
  text-decoration: none;
}

.pfm-precall-provider-context__profile-link a:hover {
  text-decoration: underline;
}

@media (max-width: 520px) {
  .pfm-precall-provider-context__row {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

/* —— Sticky footer —— */
.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-spacer--precall {
  height: var(--pfm-footer-h);
  flex-shrink: 0;
}

.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer--precall-sticky {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  border-top: 1px solid var(--pfm-border);
  background: color-mix(in srgb, #fff 94%, var(--pfm-page-bg));
  backdrop-filter: blur(10px);
  box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.08);
  padding: 0;
}

.pfm-precall-footer__inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
  max-width: var(--pfm-read-max);
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  padding: 10px var(--pfm-pad-x) calc(10px + env(safe-area-inset-bottom, 0px));
}

.pfm-precall-footer__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  font-size: 13px;
  font-weight: 700;
  color: var(--pfm-meta);
  text-decoration: none;
  flex-shrink: 0;
}

.pfm-precall-footer__back:hover {
  color: var(--pfm-ink);
}

.pfm-precall-footer__actions {
  display: flex;
  flex: 1 1 auto;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}

.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-btn {
  min-height: 44px;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-btn--primary {
  flex: 1 1 160px;
  max-width: 240px;
  color: #fff;
  background: linear-gradient(180deg, #0f766e 0%, #0d9488 100%);
  border-color: color-mix(in srgb, #0d9488 40%, #0f172a);
  box-shadow: 0 2px 8px color-mix(in srgb, #0d9488 28%, transparent);
}

.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-btn--primary:hover:not(:disabled) {
  filter: brightness(1.05);
}

.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-btn--secondary {
  flex: 0 1 auto;
  color: var(--pfm-ink);
  background: #fff;
  border-color: var(--pfm-border);
}

.prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 479px) {
  .pfm-precall-footer__inner {
    flex-direction: column;
    align-items: stretch;
  }

  .pfm-precall-footer__actions {
    width: 100%;
  }

  .prepare-for-meeting-page--precall-plan .prepare-for-meeting-footer-btn--primary {
    max-width: none;
  }
}

/* —— Dialog —— */
.pfm-precall-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: color-mix(in srgb, var(--pfm-ink) 35%, transparent);
}

.pfm-precall-dialog {
  width: 100%;
  max-width: 400px;
  padding: 16px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid var(--pfm-border);
  box-shadow: 0 16px 48px rgba(15, 23, 42, 0.18);
}

.pfm-precall-dialog__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--pfm-ink);
}

.pfm-precall-dialog__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--pfm-meta);
}

.pfm-precall-dialog__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

/* Loading shell */
.prepare-for-meeting-page--precall-plan .prepare-for-meeting-header {
  max-width: var(--pfm-read-max);
  margin: 0 auto;
  padding: 16px var(--pfm-pad-x);
}
`;
