/** Provider detail command header — field execution identity strip. */
export const providerCommandHeaderCss = `
.provider-command-header {
  min-width: 0;
}

.provider-command-header__surface {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.6fr) auto;
  align-items: center;
  gap: 14px 18px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border));
  border-left: 4px solid var(--brand-600);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--brand-600) 4%, #fff) 0%,
      #fff 52%,
      color-mix(in srgb, var(--foreground) 1.5%, #fff) 100%
    );
  box-shadow: 0 2px 8px color-mix(in srgb, var(--foreground) 5%, transparent);
}

.provider-command-header__left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.provider-command-header__identity {
  flex: 1;
  min-width: 0;
}

.provider-command-header__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  min-width: 0;
}

.provider-command-header__name {
  margin: 0;
  font-size: 19px;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: var(--foreground);
}

.provider-command-header__stage {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 4%, #fff);
  color: color-mix(in srgb, var(--foreground) 78%, var(--muted));
}

.provider-command-header__track {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.provider-command-header__track-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.provider-command-header__stage--select {
  appearance: auto;
  cursor: pointer;
  padding-right: 6px;
}

.provider-command-header__meta {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: var(--muted);
  font-weight: 600;
}

.provider-command-header__context {
  min-width: 0;
}

.provider-command-header__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
}

.provider-command-chip {
  display: inline-flex;
  align-items: center;
  flex: 0 1 auto;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0.02em;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  background: color-mix(in srgb, var(--foreground) 3%, #fff);
  color: var(--foreground);
}

.provider-command-chip--brand {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700);
}

.provider-command-chip--success {
  border-color: color-mix(in srgb, #0d9488 24%, var(--border));
  background: color-mix(in srgb, #14b8a6 10%, #fff);
  color: #0f766e;
}

.provider-command-chip--warn {
  border-color: color-mix(in srgb, #d97706 26%, var(--border));
  background: color-mix(in srgb, #d97706 9%, #fff);
  color: #92400e;
}

.provider-command-chip--intel {
  border-color: color-mix(in srgb, #6366f1 22%, var(--border));
  background: color-mix(in srgb, #6366f1 8%, #fff);
  color: #4338ca;
}

.provider-command-chip--neutral {
  color: color-mix(in srgb, var(--foreground) 82%, var(--muted));
}

.provider-command-chip--more {
  border-style: dashed;
  color: var(--muted);
  font-weight: 700;
}

.provider-command-header__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  flex-shrink: 0;
}

.provider-command-header__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 16px;
  border-radius: 9px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  font-family: inherit;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 1px 2px color-mix(in srgb, var(--brand-700) 24%, transparent);
}

.provider-command-header__cta:hover,
.provider-command-header__cta:focus-visible {
  background: var(--brand-700);
  border-color: var(--brand-700);
  outline: none;
}

.provider-command-header__cta:disabled {
  opacity: 0.65;
  cursor: wait;
}

.provider-hd-top--command {
  align-items: stretch;
}

.provider-hd-top--command .provider-command-header {
  flex: 1 1 auto;
  min-width: 0;
}

.provider-hd-top--command .provider-hd-actions {
  align-self: flex-start;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .provider-command-header__surface {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 10px 12px;
  }

  .provider-command-header__actions {
    width: 100%;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .provider-command-header__cta {
    flex: 1 1 auto;
    min-width: 0;
  }

  .provider-command-header__name {
    font-size: 17px;
  }

  .provider-command-chip {
    font-size: 11px;
    padding: 3px 8px;
  }
}

@media (min-width: 769px) {
  .provider-command-header__name {
    font-size: 21px;
  }
}
`;
