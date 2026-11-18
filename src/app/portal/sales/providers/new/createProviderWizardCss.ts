export const createProviderWizardCss = `
.create-provider-root {
  width: 100%;
  max-width: none;
  min-height: calc(100dvh - 52px);
  background: #fff;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.create-provider-header {
  padding: 8px 12px 10px;
  border-bottom: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 4%, #fff), #fff);
}

.create-provider-header-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  min-width: 0;
}

.create-provider-back {
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-700);
  text-decoration: none;
  display: inline-block;
  margin-bottom: 0;
}

.create-provider-title {
  margin: 0;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.create-provider-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--muted);
  line-height: 1.4;
  max-width: 52ch;
}

.create-provider-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.create-provider-body {
  flex: 1;
  min-width: 0;
  padding: 12px 12px calc(58px + env(safe-area-inset-bottom, 0px));
  display: grid;
  gap: 12px;
  align-content: start;
  overflow-x: hidden;
}

.create-provider-layout {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.create-provider-column {
  min-width: 0;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.create-provider-column-heading {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.create-provider-field {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.create-provider-field--full {
  grid-column: 1 / -1;
}

.create-provider-field label {
  font-size: 12px;
  font-weight: 800;
}

.create-provider-field .hint {
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.create-provider-field input,
.create-provider-field select,
.create-provider-field textarea {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 6px 9px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  font-size: 14px;
  font-family: inherit;
  background: #fff;
}

.create-provider-field textarea {
  resize: vertical;
  min-height: 72px;
}

.create-provider-org-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: stretch;
}
.create-provider-org-picker select {
  flex: 1 1 180px;
  min-width: 0;
}
.create-provider-org-new-link {
  flex: 0 0 auto;
  align-self: center;
  padding: 4px 8px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
}
.create-provider-org-new-link:hover {
  color: var(--brand-600);
}
.create-provider-org-new-link:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 50%, transparent);
  outline-offset: 2px;
  border-radius: 4px;
}

.create-provider-step-fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.create-provider-step-fields--profile {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
}

.create-provider-contact-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.create-provider-contact-heading {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.create-provider-pathway-fieldset {
  margin: 0;
  padding: 0;
  border: none;
  min-width: 0;
}

.create-provider-pathway-fieldset {
  margin-bottom: 14px;
}

.create-provider-pathway-legend {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
  padding: 0;
}

.create-provider-track-fieldset {
  margin: 0 0 14px;
  padding: 0;
  border: none;
  min-width: 0;
}

.create-provider-track {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.create-provider-track__choice {
  display: grid;
  gap: 4px;
  min-height: 72px;
  padding: 10px 12px;
  text-align: left;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: #fff;
  cursor: pointer;
  font-family: inherit;
}

.create-provider-track__choice:hover {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.create-provider-track__choice:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 45%, transparent);
  outline-offset: 2px;
}

.create-provider-track__choice--selected {
  border-color: color-mix(in srgb, var(--brand-600) 55%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
}

.create-provider-track__label {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--foreground);
}

.create-provider-track__hint {
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 600;
}

.create-provider-optional {
  font-weight: 700;
  text-transform: none;
  letter-spacing: normal;
  color: color-mix(in srgb, var(--muted) 85%, transparent);
}

.create-provider-pathway__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  align-items: flex-start;
  gap: 0;
  min-width: 0;
}

.create-provider-pathway__segment {
  display: flex;
  align-items: flex-start;
  flex: 1 1 0;
  min-width: 0;
}

.create-provider-pathway__segment:last-child {
  flex: 0 0 auto;
}

.create-provider-pathway__step {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  min-height: 44px;
  padding: 2px 4px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: inherit;
  text-align: center;
}

.create-provider-pathway__step:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--brand-600) 45%, transparent);
  outline-offset: 2px;
  border-radius: 6px;
}

.create-provider-pathway__marker {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  border: 2px solid color-mix(in srgb, var(--foreground) 18%, var(--border));
  background: #fff;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.create-provider-pathway__label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  color: color-mix(in srgb, var(--foreground) 55%, var(--muted));
  letter-spacing: -0.01em;
}

.create-provider-pathway__connector {
  flex: 1 1 auto;
  min-width: 4px;
  height: 2px;
  margin: 6px 2px 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 10%, var(--border));
  transition: background 0.15s ease;
}

.create-provider-pathway__connector--active {
  background: color-mix(in srgb, var(--brand-600) 55%, var(--border));
}

.create-provider-pathway__step--past .create-provider-pathway__marker {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 18%, #fff);
}

.create-provider-pathway__step--past .create-provider-pathway__label {
  color: color-mix(in srgb, var(--foreground) 72%, var(--muted));
}

.create-provider-pathway__step--selected .create-provider-pathway__marker {
  width: 12px;
  height: 12px;
  margin-top: -1px;
  border-color: var(--brand-600);
  background: var(--brand-600);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand-600) 18%, transparent);
}

.create-provider-pathway__step--selected .create-provider-pathway__label {
  color: var(--brand-700);
  font-weight: 800;
}

.create-provider-pathway-hint {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: var(--muted);
  font-weight: 600;
}

.create-provider-footer {
  position: sticky;
  bottom: 0;
  z-index: 30;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
  background: #fff;
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  box-shadow: 0 -1px 0 color-mix(in srgb, var(--foreground) 4%, var(--border));
}

.create-provider-footer button,
.create-provider-footer a {
  flex: 1 1 0;
  min-width: 0;
  min-height: 40px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, var(--surface));
  color: var(--brand-700);
  cursor: pointer;
}

.create-provider-footer .primary {
  background: var(--brand-600);
  color: #fff;
  border-color: color-mix(in srgb, var(--brand-600) 80%, black);
}

.create-provider-footer button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (min-width: 769px) {
  .create-provider-header,
  .create-provider-body,
  .create-provider-footer {
    padding-left: clamp(20px, 2.5vw, 40px);
    padding-right: clamp(20px, 2.5vw, 40px);
  }

  .create-provider-body {
    padding-top: 16px;
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    gap: 16px;
  }

  .create-provider-layout {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    gap: 16px;
    align-items: start;
  }

  .create-provider-column {
    padding: 14px 16px;
  }

  .create-provider-pathway__label {
    font-size: 11px;
  }

  .create-provider-footer {
    width: 100%;
    box-sizing: border-box;
    justify-content: flex-end;
  }

  .create-provider-footer button,
  .create-provider-footer a {
    flex: 0 1 auto;
    min-width: 120px;
    padding: 0 16px;
  }

  .create-provider-footer a {
    margin-right: auto;
    flex: 0 0 auto;
    min-width: 0;
    background: transparent;
    border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
    color: var(--muted);
  }

  .create-provider-footer .primary {
    min-width: 148px;
  }
}

@media (min-width: 1200px) {
  .create-provider-header,
  .create-provider-body,
  .create-provider-footer {
    padding-left: 32px;
    padding-right: 32px;
  }

  .create-provider-layout {
    max-width: 960px;
  }
}

@media (max-width: 768px) {
  .create-provider-root {
    min-height: 100dvh;
  }

  .create-provider-step-fields--profile {
    grid-template-columns: 1fr;
  }

  .create-provider-pathway__label {
    font-size: 9px;
  }

  .create-provider-pathway__connector {
    min-width: 2px;
    margin: 6px 1px 0;
  }

  .create-provider-body {
    padding: 10px 10px calc(72px + env(safe-area-inset-bottom, 0px));
  }

  .create-provider-footer {
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  }

  .create-provider-footer button,
  .create-provider-footer a {
    min-height: 44px;
    font-size: 13px;
  }
}

@media (max-width: 520px) {
  .create-provider-title {
    font-size: 16px;
  }

  .create-provider-header {
    padding: 8px 10px 8px;
  }

  .create-provider-footer {
    flex-wrap: wrap;
  }

  .create-provider-footer .primary {
    flex: 1 1 100%;
    order: -1;
  }

  .create-provider-footer button,
  .create-provider-footer a {
    flex: 1 1 calc(50% - 4px);
  }
}
`;
