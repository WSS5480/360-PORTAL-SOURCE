/** Field Briefing — premium tactical pre-call sheet. */

export const providerFieldBriefingCss = `
.provider-profile-root--field-briefing .provider-profile-header--briefing .provider-wmn,
.provider-profile-root--field-briefing .provider-profile-header--briefing .provider-act-row,
.provider-profile-root--field-briefing .provider-planning-summary {
  display: none;
}

.provider-profile-root--field-briefing .provider-profile-sticky {
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, transparent);
}

.pfb {
  max-width: 440px;
  margin: 0 auto;
  padding: 2px 12px calc(52px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 9px;
  font-size: 13px;
  line-height: 1.34;
  color: var(--foreground);
}

/* —— Touch anchor —— */
.pfb-touch {
  margin: 0 0 2px;
  padding: 7px 9px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, transparent);
}

.pfb-touch--draft {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 10%, transparent);
}

.pfb-touch-kicker {
  margin: 0 0 2px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 75%, var(--foreground));
}

.pfb-touch--draft .pfb-touch-kicker {
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pfb-touch-main {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.pfb-touch-main strong {
  font-weight: 800;
  letter-spacing: -0.01em;
}

.pfb-touch-when {
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
}

.pfb-touch-sep {
  color: color-mix(in srgb, var(--foreground) 35%, transparent);
}

.pfb-touch-sub {
  margin: 2px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
}

.pfb-touch-links {
  margin: 4px 0 0;
  font-size: 10px;
  font-weight: 700;
}

.pfb-touch-links a {
  color: var(--brand-700);
  text-decoration: none;
}

.pfb-touch-links a:hover {
  text-decoration: underline;
}

/* —— Empty / setup —— */
.pfb-setup {
  max-width: 400px;
  margin: 8px auto 0;
  padding: 4px 2px 24px;
  text-align: center;
}

.pfb-setup-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.pfb-setup-body {
  margin: 0 0 14px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pfb-setup-actions {
  margin-bottom: 12px;
}

.pfb-setup-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  color: #fff;
  background: var(--brand-600);
}

.pfb-setup-divider {
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 40%, transparent);
}

.pfb-setup-touches {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
}

.pfb-setup-touch {
  width: 100%;
  display: block;
  margin: 0;
  padding: 9px 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.pfb-setup-touch:hover {
  border-color: color-mix(in srgb, var(--brand-600) 22%, transparent);
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pfb-setup-touch-label {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: var(--foreground);
  margin-bottom: 2px;
}

.pfb-setup-touch-desc {
  display: block;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pfb-setup-hint {
  margin: 12px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
}

.pfb-setup-hint a {
  color: var(--brand-700);
  font-weight: 700;
  text-decoration: none;
}

.pfb-setup-hint a:hover {
  text-decoration: underline;
}

/* —— Header —— */
.pfb-head {
  margin: 0;
  padding: 2px 0 7px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 7%, transparent);
}

.pfb-head-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 7px;
}

.pfb-head-id {
  min-width: 0;
}

.pfb-head-name {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.pfb-head-fac {
  margin: 1px 0 0;
  font-size: 11px;
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 55%, transparent);
  line-height: 1.25;
}

.pfb-head-stage {
  flex-shrink: 0;
  margin-top: 1px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--brand-700) 90%, var(--foreground));
  background: color-mix(in srgb, var(--brand-600) 9%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 14%, transparent);
}

.pfb-sec--objective {
  margin-top: -2px;
}

.pfb-sec--objective .pfb-mission {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.26;
  letter-spacing: -0.03em;
  color: var(--foreground);
}

.pfb-sec--objective .pfb-ctx {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.35;
  color: color-mix(in srgb, var(--foreground) 58%, transparent);
}

.pfb-sec--after {
  margin-top: 2px;
}

.pfb-after-hint {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  color: color-mix(in srgb, var(--foreground) 62%, transparent);
}

.pfb-sec--context .pfb-context {
  margin: 0;
}

.pfb-context-row {
  display: grid;
  grid-template-columns: 7.5em 1fr;
  gap: 3px 10px;
  margin-bottom: 4px;
  align-items: baseline;
}

.pfb-context-row:last-child {
  margin-bottom: 0;
}

.pfb-context-row dt {
  margin: 0;
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 50%, transparent);
}

.pfb-context-row dd {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.32;
  color: color-mix(in srgb, var(--foreground) 86%, transparent);
}

/* —— Sections —— */
.pfb-sec {
  margin: 0;
}

.pfb-sec-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 5px;
}

.pfb-sec-title {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--foreground) 46%, transparent);
}

.pfb-sec-util {
  padding: 2px 0;
  border: none;
  background: none;
  font-size: 10px;
  font-weight: 700;
  color: color-mix(in srgb, var(--foreground) 44%, transparent);
  cursor: pointer;
  transition: color 0.12s ease;
}

.pfb-sec-util:hover {
  color: var(--brand-700);
}

/* —— Questions —— */
.pfb-asks {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pfb-ask {
  padding: 5px 6px 4px;
  border-radius: 7px;
  transition: background 0.12s ease;
}

.pfb-ask:hover {
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
}

.pfb-ask-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
}

.pfb-ask-n {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 11%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 16%, transparent);
}

.pfb-ask-q {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.34;
  letter-spacing: -0.01em;
}

.pfb-ask-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  margin: 2px 0 0 26px;
}

.pfb-ask-sep {
  color: color-mix(in srgb, var(--foreground) 28%, transparent);
  font-size: 11px;
  user-select: none;
}

.pfb-ask-act {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
  color: color-mix(in srgb, var(--brand-600) 88%, var(--foreground));
  cursor: pointer;
  text-decoration: none;
}

.pfb-ask-act:hover {
  color: var(--brand-700);
  text-decoration: underline;
}

.pfb-ask-act:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 45%, transparent);
  outline-offset: 1px;
  border-radius: 2px;
}

.pfb-ask-act--on {
  color: var(--ok-600, #059669);
}

.pfb-ask-act--link {
  display: inline;
}

.pfb-ask--done {
  opacity: 0.72;
}

.pfb-ask--done .pfb-ask-q {
  font-weight: 600;
  color: color-mix(in srgb, var(--foreground) 48%, transparent);
  text-decoration: line-through;
  text-decoration-color: color-mix(in srgb, var(--foreground) 22%, transparent);
}

.pfb-ask--done .pfb-ask-n {
  color: color-mix(in srgb, var(--foreground) 45%, transparent);
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
  border-color: color-mix(in srgb, var(--foreground) 10%, transparent);
}

/* —— Unknown tags —— */
.pfb-tags {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pfb-tag {
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.25;
  color: color-mix(in srgb, var(--foreground) 72%, transparent);
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 9%, transparent);
  box-shadow: 0 1px 0 color-mix(in srgb, var(--foreground) 4%, transparent);
}

/* —— Avoid (subtle warn lane) —— */
.pfb-sec--warn {
  padding: 6px 8px 6px 10px;
  margin: 0 -2px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--warn-600, #d97706) 4%, #fff);
  border-left: 2px solid color-mix(in srgb, var(--warn-600, #d97706) 55%, transparent);
}

.pfb-sec--warn .pfb-sec-title {
  color: color-mix(in srgb, var(--warn-800, #92400e) 75%, var(--foreground));
}

.pfb-lines {
  margin: 0;
  padding: 0 0 0 10px;
  list-style: none;
}

.pfb-lines li {
  position: relative;
  padding-left: 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.34;
  margin-bottom: 3px;
}

.pfb-lines li:last-child {
  margin-bottom: 0;
}

.pfb-lines li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55em;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--warn-600, #d97706) 70%, var(--foreground));
}

.pfb-sec--warn .pfb-lines li {
  color: color-mix(in srgb, var(--warn-900, #78350f) 88%, var(--foreground));
}

/* —— Success (subtle ok lane) —— */
.pfb-sec--ok {
  padding: 6px 8px;
  margin: 0 -2px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--ok-600, #059669) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--ok-600, #059669) 12%, transparent);
}

.pfb-sec--ok .pfb-sec-title {
  color: color-mix(in srgb, var(--ok-700, #047857) 80%, var(--foreground));
}

.pfb-lines--ok li::before {
  content: "✓";
  top: 0;
  width: auto;
  height: auto;
  border-radius: 0;
  background: none;
  font-size: 11px;
  font-weight: 900;
  color: var(--ok-600, #059669);
}

.pfb-lines--ok li {
  padding-left: 14px;
  color: color-mix(in srgb, var(--foreground) 84%, transparent);
  font-weight: 700;
}

/* —— Footer —— */
.pfb-foot {
  position: sticky;
  bottom: 0;
  z-index: 2;
  margin: 0 -12px;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, #fff 96%, transparent);
  backdrop-filter: blur(8px);
  border-top: 1px solid color-mix(in srgb, var(--foreground) 7%, transparent);
  box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.04);
}

.pfb-foot-primary {
  display: block;
  width: 100%;
  height: 30px;
  margin-bottom: 5px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 800;
  line-height: 30px;
  text-align: center;
  text-decoration: none;
  letter-spacing: 0.01em;
  color: #fff;
  background: var(--brand-600);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--brand-600) 35%, transparent);
  transition: filter 0.12s ease, transform 0.12s ease;
}

.pfb-foot-primary:hover {
  filter: brightness(1.04);
}

.pfb-foot-primary:active {
  transform: translateY(0.5px);
}

.pfb-foot-secondary {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.pfb-foot-ghost {
  flex: 1;
  max-width: 50%;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 800;
  text-decoration: none;
  color: color-mix(in srgb, var(--foreground) 68%, transparent);
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, transparent);
  transition: border-color 0.12s ease, color 0.12s ease;
}

.pfb-foot-ghost:hover {
  color: var(--brand-700);
  border-color: color-mix(in srgb, var(--brand-600) 22%, transparent);
}

@media (max-width: 768px) {
  .pfb {
    padding: 2px 10px calc(50px + env(safe-area-inset-bottom, 0px));
    gap: 8px;
  }

  .pfb-sec--objective .pfb-mission {
    font-size: 16px;
  }

  .pfb-context-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .pfb-foot {
    margin-left: -10px;
    margin-right: -10px;
    padding-left: 10px;
    padding-right: 10px;
  }
}
`;
