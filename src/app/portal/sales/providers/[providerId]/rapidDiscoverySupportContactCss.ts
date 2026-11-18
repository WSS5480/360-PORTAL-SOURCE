/** Shared styles for support-contact pickers (Rapid Discovery, overview workflow, quick capture). */
export const rapidDiscoverySupportContactCss = `
.rd-support {
  margin-top: 10px;
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 10px;
}

.rd-support--drawer {
  margin-top: 0;
  border: none;
  border-radius: 0;
}

.rd-support-body--drawer {
  padding: 0;
}

.rd-support-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
  text-align: left;
  cursor: pointer;
}

.rd-support-toggle-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.rd-support-toggle-hint {
  flex: 1;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.rd-support-toggle-chevron {
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
}

.rd-support-body {
  padding: 8px 10px 10px;
  display: grid;
  gap: 8px;
}

.rd-support-mode {
  display: flex;
  gap: 6px;
}

.rd-support-mode-btn {
  flex: 1;
  min-height: 30px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.rd-support-mode-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 40%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.rd-support-input {
  width: 100%;
  min-height: 34px;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  font-size: 13px;
}

.rd-support-textarea {
  min-height: 56px;
  resize: vertical;
}

.rd-support-pick-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
}

.rd-support-pick {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
}

.rd-support-pick--selected {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.rd-support-pick-name {
  font-size: 12px;
  font-weight: 700;
}

.rd-support-pick-meta {
  font-size: 10px;
  font-weight: 600;
  color: var(--muted);
}

.rd-support-create-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rd-support-field {
  display: grid;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
}

.rd-support-field--full {
  grid-column: 1 / -1;
}

.rd-support-empty {
  font-size: 11px;
  color: var(--muted);
  padding: 6px 2px;
}

.rd-support-footnote {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.rd-support--operational .rd-support-body {
  gap: 10px;
}

.rd-support-helper {
  margin: 0;
  font-size: 11px;
  line-height: 1.35;
  font-weight: 600;
  color: var(--muted);
}

.rd-support-section-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.rd-support-type-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}

.rd-support-type-btn {
  min-height: 34px;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}

.rd-support-type-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
}

.rd-support-steps {
  display: flex;
  gap: 6px;
}

.rd-support-step {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  border: 1px solid var(--border);
  background: var(--surface);
}

.rd-support-step--active {
  color: #fff;
  border-color: var(--brand-600);
  background: var(--brand-600);
}

.rd-support-step--done {
  color: #0f766e;
  border-color: #99f6e4;
  background: #ecfdf5;
}

.rd-support-workflow {
  margin: 0;
  padding: 0;
  border: none;
}

.rd-support-role-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rd-support-role-chip {
  min-height: 30px;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 700;
  color: var(--foreground);
  cursor: pointer;
  font-family: inherit;
}

.rd-support-role-chip--selected {
  border-color: color-mix(in srgb, var(--brand-600) 45%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 10%, var(--surface));
  color: color-mix(in srgb, var(--brand-700, #1d4ed8) 70%, var(--foreground));
}

.rd-support-role-chip--suggested {
  border-style: dashed;
}

.rd-support-role-selected {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.rd-support-role-details {
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  background: color-mix(in srgb, var(--brand-600) 2%, var(--surface));
}

.rd-support-role-details > summary {
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.rd-support-role-details-list {
  margin: 6px 0 0;
  padding-left: 16px;
  display: grid;
  gap: 4px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.rd-support-show-providers {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.rd-support-selected-summary,
.rd-support-create-summary {
  padding: 7px 8px;
  border-radius: 7px;
  background: color-mix(in srgb, var(--brand-600) 5%, var(--surface));
  border: 1px solid color-mix(in srgb, var(--brand-600) 15%, var(--border));
  font-size: 11px;
  line-height: 1.4;
}

.rd-support-selected-summary p,
.rd-support-create-summary p {
  margin: 0;
}

.rd-support-workflow-preview {
  margin: 0;
  font-size: 11px;
  font-weight: 650;
  color: var(--foreground);
}

.rd-support-create-nav {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.rd-support-nav-btn {
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}

.rd-support-nav-btn--primary {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

.rd-support-assignment {
  margin: 0;
  padding: 0;
  border: none;
}

.rd-support-assignment-grid {
  display: grid;
  gap: 6px;
}

.rd-support-assignment-btn {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  text-align: left;
  cursor: pointer;
}

.rd-support-assignment-btn--active {
  border-color: color-mix(in srgb, var(--brand-600) 42%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 8%, var(--surface));
}

.rd-support-assignment-btn-label {
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
}

.rd-support-assignment-btn-desc {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1.35;
}

.rd-support-workflow-zones {
  display: grid;
  gap: 10px;
}

.rd-support-workflow-zone-label {
  margin: 0 0 6px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--muted);
}

.rd-support-workflow-empty {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  font-style: italic;
}

.rd-support-workflow-divider {
  height: 1px;
  background: color-mix(in srgb, var(--foreground) 8%, var(--border));
}

.rd-support-role-selected-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px 4px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 35%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 12%, var(--surface));
  font-size: 11px;
  font-weight: 800;
  color: var(--foreground);
}

.rd-support-role-selected-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 8%, transparent);
  color: var(--muted);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
}

.rd-support-role-selected-remove:hover {
  background: color-mix(in srgb, var(--brand-600) 18%, transparent);
  color: var(--foreground);
}

.rd-support-review {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
}

.rd-support-review-title {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--foreground);
}

.rd-support-review-list {
  margin: 0;
  display: grid;
  gap: 8px;
}

.rd-support-review-list > div {
  display: grid;
  grid-template-columns: minmax(110px, 38%) 1fr;
  gap: 8px;
  align-items: start;
}

.rd-support-review-list dt {
  margin: 0;
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.rd-support-review-list dd {
  margin: 0;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.4;
  color: var(--foreground);
}

.rd-support-review-linked {
  margin: 0;
  padding-left: 16px;
}

@media (max-width: 480px) {
  .rd-support-create-grid {
    grid-template-columns: 1fr;
  }

  .rd-support-review-list > div {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .rd-support-mode-btn,
  .rd-support-type-btn,
  .rd-support-role-chip,
  .rd-support-pick,
  .rd-support-show-providers {
    min-height: 44px;
  }

  .rd-support-input,
  .rd-support-field input,
  .rd-support-field select,
  .rd-support-field textarea {
    min-height: 44px;
    font-size: 16px;
  }

  .rd-support-textarea {
    min-height: 72px;
  }

  .rd-support-type-grid {
    grid-template-columns: 1fr;
  }

  .rd-support-role-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 calc(50% - 4px);
  }
}
`;
