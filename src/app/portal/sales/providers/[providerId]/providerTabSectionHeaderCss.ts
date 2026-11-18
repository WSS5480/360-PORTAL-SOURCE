/** Shared tab section header — consistent across Overview, Engagements, Cases, Intelligence. */
export const providerTabSectionHeaderCss = `
.provider-tab-section-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px 10px;
  min-width: 0;
  margin-bottom: 2px;
}

.provider-tab-section-header--toolbar {
  justify-content: flex-end;
  margin-bottom: 0;
}

.provider-tab-section-header__main {
  min-width: 0;
  flex: 1 1 12rem;
}

.provider-tab-section-header__title {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--foreground);
}

.provider-tab-section-header__subtitle {
  margin: 3px 0 0;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
  max-width: 40rem;
}

.provider-tab-section-header__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
  font-family: inherit;
  cursor: pointer;
}

.provider-tab-section-header__action:hover {
  filter: brightness(1.04);
}

.provider-tab-workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}
`;
