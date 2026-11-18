/**
 * Quick Add Case — design pass in the "field dossier" language.
 * Desktop: centered dossier card. Mobile: full-viewport shell with sticky save.
 */
export const quickAddLayoutCss = `
/* ---- Portal edge-to-edge on mobile ---- */
.portal-contentWrap:has(.quick-add-shell),
.portal-content:has(.quick-add-shell) {
  padding: 0 !important;
  padding-top: 0 !important;
  max-width: none !important;
}
.portal-content:has(.quick-add-shell) {
  gap: 0 !important;
}
.crm-sales-page-bg:has(.quick-add-shell) {
  padding: 0 !important;
  gap: 0 !important;
  max-width: 100% !important;
}

/* ---- Page canvas + header ---- */
.sales-cmd-native-wrap:has(.quick-add-shell) {
  min-height: 100dvh;
  background:
    radial-gradient(44rem 18rem at 8% -6%, rgba(13, 148, 136, 0.06), transparent 60%),
    radial-gradient(40rem 16rem at 96% 0%, rgba(37, 99, 235, 0.05), transparent 55%),
    linear-gradient(180deg, #eaeef5 0%, #e2e8f0 100%);
}

.quick-add-shell {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
}

.quick-add-shell-status {
  padding: 8px 14px;
  font-size: 13px;
  color: var(--muted);
}

.quick-add-shell-error {
  margin: 0 0 10px !important;
  font-size: 13px;
}

.quick-add-form {
  display: contents;
}

.quick-add-scroll {
  display: contents;
}

.quick-add-footer {
  display: block;
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
  padding: 0 14px calc(28px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.create-case-header {
  position: relative;
  padding: 10px 14px 12px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
}

.create-case-header::before {
  content: "";
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: linear-gradient(90deg, var(--brand-600, #2563eb), #22d3ee 55%, transparent 95%);
}

.create-case-back {
  gap: 4px;
  padding: 4px 10px 4px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  transition: background 0.14s ease, border-color 0.14s ease;
}

.create-case-back:hover {
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  border-color: color-mix(in srgb, var(--brand-600) 32%, var(--border));
}

.create-case-title {
  font-size: 20px;
  letter-spacing: -0.03em;
}

.create-case-subtitle {
  font-size: 12px;
}

/* ---- Who / Where / When / What strip ---- */
.quick-add-steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 560px;
  margin: 14px auto 0;
  padding: 0 14px;
}

.quick-add-steps__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  background: #fff;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.quick-add-steps__item:not(:first-child)::before {
  content: "";
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--foreground) 24%, var(--border));
  margin-right: 2px;
}

.quick-add-steps__item--save {
  color: #0f766e;
  background: linear-gradient(180deg, #f0fdfa, #ccfbf1);
  border-color: rgba(13, 148, 136, 0.3);
}

/* ---- Form card ---- */
.quick-add-root {
  max-width: 560px;
  margin: 0 auto;
  padding: 12px 14px calc(28px + env(safe-area-inset-bottom, 0px));
  min-width: 0;
}

.quick-add-card {
  display: grid;
  gap: 16px;
  padding: 18px 18px 20px;
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

@media (prefers-reduced-motion: no-preference) {
  .quick-add-steps,
  .quick-add-card {
    animation: quick-add-rise 0.4s cubic-bezier(0.22, 0.9, 0.32, 1) backwards;
  }
  .quick-add-card { animation-delay: 0.05s; }
}

@keyframes quick-add-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.quick-add-card .new-case-section {
  border-bottom: none;
  padding-bottom: 0;
}

.quick-add-card .new-case-fields-2 {
  gap: 12px;
}

.quick-add-card .new-case-title {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

/* ---- Case type cards ---- */
.quick-add-type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.quick-add-type-btn {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 12px 34px 12px 12px;
  min-height: 56px;
  text-align: left;
  border-radius: 13px;
  border: 1px solid color-mix(in srgb, var(--foreground) 11%, var(--border));
  background: linear-gradient(180deg, #fff, #f8fafc);
  cursor: pointer;
  font-family: inherit;
  color: var(--foreground);
  transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}

.quick-add-type-btn:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.quick-add-type-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, #22d3ee 75%, var(--brand-600));
  outline-offset: 2px;
}

.quick-add-type-btn__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  background: color-mix(in srgb, var(--foreground) 5%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  transition: color 0.14s ease, background 0.14s ease, border-color 0.14s ease;
}

.quick-add-type-btn__icon svg {
  width: 18px;
  height: 18px;
}

.quick-add-type-btn__label {
  font-weight: 800;
  font-size: 12.5px;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

/* Selected: gradient ring + check dot. */
.quick-add-type-btn.is-selected {
  border-color: color-mix(in srgb, var(--brand-600) 55%, var(--border));
  background: linear-gradient(150deg, color-mix(in srgb, var(--brand-600) 9%, #fff) 0%, color-mix(in srgb, #22d3ee 6%, #fff) 100%);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 30%, transparent), 0 4px 14px color-mix(in srgb, var(--brand-600) 14%, transparent);
}

.quick-add-type-btn.is-selected .quick-add-type-btn__icon {
  color: #fff;
  background: linear-gradient(
    165deg,
    color-mix(in srgb, #22d3ee 22%, var(--brand-600)) 0%,
    var(--brand-600) 55%,
    color-mix(in srgb, var(--brand-600) 88%, #0e7490) 100%
  );
  border-color: color-mix(in srgb, var(--brand-600) 60%, var(--border));
}

.quick-add-type-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  right: 12px;
  width: 16px;
  height: 16px;
  margin-top: -8px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--foreground) 16%, var(--border));
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.14s ease, background 0.14s ease, box-shadow 0.14s ease;
}

.quick-add-type-btn.is-selected::after {
  border-color: var(--brand-600);
  background: var(--brand-600);
  box-shadow: inset 0 0 0 3px #fff;
}

/* ---- Fields ---- */
.quick-add-field {
  display: grid;
  gap: 6px;
}

.quick-add-label {
  font-weight: 800;
  font-size: 12px;
  line-height: 1.25;
  color: var(--foreground);
}

.quick-add-hint {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 550;
}

.quick-add-optional {
  font-weight: 550;
  color: var(--muted);
}

.quick-add-label-secondary {
  font-size: 11px;
  font-weight: 650;
  color: var(--muted);
  line-height: 1.25;
}

/* Inputs carry inline base styles — refine the shell + focus ring here. */
.quick-add-card :is(input, select, textarea) {
  border-radius: 11px !important;
  border-color: color-mix(in srgb, var(--foreground) 11%, var(--border)) !important;
  background: color-mix(in srgb, var(--foreground) 1.5%, #fff) !important;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.quick-add-card :is(input, select, textarea):hover {
  border-color: color-mix(in srgb, var(--foreground) 20%, var(--border)) !important;
}

.quick-add-card :is(input, select, textarea):focus {
  outline: none;
  background: #fff !important;
  border-color: color-mix(in srgb, #22d3ee 50%, var(--brand-600)) !important;
  box-shadow: 0 0 0 3px color-mix(in srgb, #22d3ee 18%, transparent);
}

/* ---- Provider block ---- */
.quick-add-provider-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-add-provider-secondary {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 750;
  color: var(--brand-700);
  text-decoration: none;
  line-height: 1.3;
  border: 1px solid color-mix(in srgb, var(--brand-600) 20%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
  transition: background 0.14s ease, border-color 0.14s ease, color 0.14s ease;
}

.quick-add-provider-secondary:hover {
  color: #fff;
  background: var(--brand-600);
  border-color: var(--brand-600);
  text-decoration: none;
}

.quick-add-provider-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 11px 12px;
  border-radius: 12px;
  border: 1px solid rgba(13, 148, 136, 0.28);
  background: linear-gradient(180deg, #fff, #f0fdfa);
  box-shadow: inset 3px 0 0 rgba(13, 148, 136, 0.55);
}

.quick-add-provider-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
  color: var(--foreground);
}

.quick-add-provider-name::before {
  content: "";
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #14b8a6;
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.18);
}

.quick-add-provider-specialty {
  font-weight: 600;
  color: var(--muted);
}

.quick-add-provider-change {
  font-size: 11px;
  font-weight: 750;
  color: var(--brand-700);
  background: transparent;
  border: 0;
  padding: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  line-height: 1.3;
  transition: background 0.14s ease;
}

.quick-add-provider-change:hover {
  background: color-mix(in srgb, var(--brand-600) 8%, transparent);
  text-decoration: none;
}

/* ---- Procedure chips ---- */
.quick-add-procedure-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-add-procedure-chip {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.3;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: transform 0.13s ease, border-color 0.13s ease, background 0.13s ease, color 0.13s ease;
}

.quick-add-procedure-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(13, 148, 136, 0.4);
  color: #0f766e;
}

.quick-add-procedure-chip.is-selected {
  border-color: rgba(13, 148, 136, 0.5);
  background: linear-gradient(180deg, #f0fdfa, #ccfbf1);
  color: #0f766e;
  box-shadow: 0 0 0 1px rgba(13, 148, 136, 0.2);
}

/* ---- PHI hint ---- */
.quick-add-phi-hint {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  align-self: flex-start;
  margin-top: 2px;
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, var(--muted));
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

.quick-add-phi-hint::before {
  content: "";
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--foreground) 30%, var(--border));
}

/* ---- Save (desktop: inline in card) ---- */
.quick-add-actions {
  display: grid;
  gap: 8px;
  padding-top: 6px;
  border-top: 1px dashed color-mix(in srgb, var(--foreground) 12%, var(--border));
}

.quick-add-actions .quick-add-primary,
.quick-add-footer .quick-add-primary {
  width: 100%;
  min-height: 48px !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  border-radius: 13px !important;
  letter-spacing: 0.01em;
}

.quick-add-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.quick-add-primary:active:not(:disabled) {
  transform: translateY(0);
}

.quick-add-primary:not(:disabled)::after {
  content: "\\2192";
  margin-left: 8px;
  transition: transform 0.14s ease;
}

.quick-add-primary:hover:not(:disabled)::after {
  transform: translateX(3px);
}

/* ---- Mobile: full-viewport form shell ---- */
@media (max-width: 768px) {
  .portal-shell:has(.quick-add-shell) {
    height: 100dvh;
    overflow: hidden;
  }

  .portal-main:has(.quick-add-shell) {
    height: 100dvh;
    min-height: 0;
    overflow: hidden;
  }

  .portal-contentWrap:has(.quick-add-shell) {
    height: 100%;
    overflow: hidden;
    padding: 0 !important;
  }

  .portal-content:has(.quick-add-shell) {
    height: 100%;
    overflow: hidden;
    gap: 0 !important;
  }

  .sales-cmd-native-wrap:has(.quick-add-shell) {
    height: 100%;
    min-height: 0 !important;
    max-height: 100dvh;
    overflow: hidden;
    background: #fff;
  }

  .quick-add-shell {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    height: 100%;
    max-height: 100dvh;
    min-height: 0 !important;
    overflow: hidden;
    background: #fff;
  }

  .quick-add-shell-header.create-case-header {
    flex-shrink: 0;
    position: relative;
    top: auto;
    z-index: 12;
    padding: calc(8px + env(safe-area-inset-top, 0px)) 14px 8px;
    background: #fff;
    box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 7%, var(--border));
  }

  .create-case-title {
    font-size: 18px;
    margin: 0;
  }

  .create-case-subtitle {
    font-size: 11px;
    margin: 2px 0 0;
    line-height: 1.35;
  }

  .quick-add-provider-context {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .quick-add-steps {
    display: none;
  }

  .quick-add-form {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    min-height: 0;
    overflow: hidden;
  }

  .quick-add-scroll {
    display: block;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .quick-add-root {
    max-width: none;
    margin: 0;
    padding: 0;
  }

  .quick-add-card {
    gap: 12px;
    padding: 12px 14px 10px;
    border: none;
    border-radius: 0;
    background: #fff;
    box-shadow: none;
  }

  .quick-add-shell-error {
    margin: 10px 14px 0 !important;
  }

  .quick-add-card .new-case-fields-2,
  .quick-add-schedule-row {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .quick-add-type-grid {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .quick-add-type-btn {
    min-height: 48px;
    padding: 8px 26px 8px 8px;
  }

  .quick-add-type-btn__icon {
    width: 28px;
    height: 28px;
  }

  .quick-add-type-btn__label {
    font-size: 11px;
  }

  .quick-add-card :is(input, select, textarea) {
    min-height: 42px !important;
    padding: 9px 11px !important;
    font-size: 16px !important;
  }

  .quick-add-footer {
    display: block;
    max-width: none;
    margin: 0;
    flex-shrink: 0;
    position: relative;
    bottom: auto;
    z-index: 12;
    padding: 8px 14px calc(8px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    background: #fff;
    box-shadow: none;
  }

  .quick-add-footer .quick-add-primary {
    min-height: 46px !important;
    border-radius: 12px !important;
  }

  .quick-add-footer .quick-add-primary:not(:disabled)::after {
    display: none;
  }

  /* Provider overview flow — provider known, fit one screen without scroll */
  .quick-add-shell--from-provider .quick-add-scroll {
    overflow: hidden;
  }

  .quick-add-shell--from-provider .quick-add-shell-header.create-case-header {
    padding-top: calc(6px + env(safe-area-inset-top, 0px));
    padding-bottom: 6px;
  }

  .quick-add-shell--from-provider .create-case-title {
    font-size: 17px;
  }

  .quick-add-shell--from-provider .quick-add-provider-section,
  .quick-add-shell--from-provider .quick-add-note-field,
  .quick-add-shell--from-provider .quick-add-new-provider-link {
    display: none !important;
  }

  .quick-add-shell--from-provider .quick-add-case-type-section .new-case-title {
    display: none;
  }

  .quick-add-shell--from-provider .quick-add-card {
    gap: 8px;
    padding: 8px 12px 6px;
  }

  .quick-add-shell--from-provider .quick-add-type-btn {
    min-height: 42px;
  }

  .quick-add-shell--from-provider .quick-add-schedule-row {
    grid-template-columns: 1.2fr 0.8fr;
    gap: 8px;
  }

  .quick-add-shell--from-provider .quick-add-schedule-row .quick-add-label {
    font-size: 11px;
  }

  .quick-add-shell--from-provider .quick-add-procedure-chips {
    display: none !important;
  }

  .quick-add-shell--from-provider .quick-add-phi-hint {
    display: none;
  }

  .quick-add-shell--from-provider .quick-add-field {
    gap: 4px;
  }

  .quick-add-shell--from-provider .quick-add-label {
    font-size: 11px;
  }
}

/* ---- Small phones ---- */
@media (max-width: 480px) {
  .quick-add-card {
    padding: 12px 12px 16px;
  }

  .quick-add-shell-header.create-case-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .quick-add-footer {
    padding-left: 12px;
    padding-right: 12px;
  }
}
`;
