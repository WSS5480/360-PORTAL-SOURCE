export const preCallPlanTemplateFlowCss = `
.pcp-template-root,
.pcp-template-sheet,
.pcp-template-body,
.pcp-template-picker {
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.pcp-template-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: color-mix(in srgb, var(--foreground) 35%, transparent);
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0;
}

.pcp-template-sheet {
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
}

.pcp-template-sheet--modal {
  max-height: min(100dvh, 720px);
  height: min(100dvh, 720px);
  display: flex;
  flex-direction: column;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -8px 32px color-mix(in srgb, var(--foreground) 16%, transparent);
}

.pcp-template-sheet--modal .pcp-template-picker {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pcp-template-sheet--modal .pcp-template-picker > .pcp-template-body,
.pcp-template-sheet--modal .pcp-template-picker > .pcp-template-body--preview {
  flex: 1;
  min-height: 0;
}

@media (min-width: 769px) {
  .pcp-template-backdrop {
    align-items: stretch;
    padding: 0;
  }
  .pcp-template-sheet--modal {
    width: 100%;
    max-width: none;
    max-height: none;
    height: 100dvh;
    border-radius: 0;
    margin: 0;
  }
  .pcp-template-pills {
    flex-wrap: wrap;
    overflow-x: visible;
    overflow-y: visible;
    gap: 5px;
  }
  .pcp-template-pill {
    max-width: none;
    padding: 5px 9px;
    min-height: 28px;
    font-size: 11px;
  }
}

.pcp-template-head {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px 8px;
  border-bottom: 1px solid var(--border);
}

.pcp-template-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.25;
}

.pcp-template-head p {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
}

.pcp-template-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
  padding: 2px 6px;
}

.pcp-template-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 12px 12px;
  -webkit-overflow-scrolling: touch;
}

.pcp-template-body--browse {
  padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px));
}

.pcp-template-picker:not(:has(.pcp-template-foot--sticky)) .pcp-template-body--browse {
  padding-bottom: 12px;
}

.pcp-template-body--preview {
  padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px));
}

.pcp-template-context-line {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.35;
  color: var(--muted);
}

.pcp-template-context-line strong {
  color: var(--foreground);
  font-weight: 800;
}

.pcp-template-chips-row {
  margin-bottom: 8px;
}

.pcp-template-results-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 2px 0 8px;
}

.pcp-template-results-count {
  font-size: 11px;
  font-weight: 800;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pcp-template-fav-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  flex-shrink: 0;
}

.pcp-suggested {
  margin-bottom: 10px;
}

.pcp-suggested-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.pcp-suggested-title {
  margin: 0;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brand-700);
}

.pcp-suggested-count {
  font-size: 10px;
  font-weight: 800;
  color: var(--muted);
  padding: 1px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--foreground) 6%, #fff);
}

.pcp-suggested-track {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  margin: 0 -2px;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.pcp-suggested-track::-webkit-scrollbar {
  display: none;
}

.pcp-suggested-slide {
  flex: 0 0 min(88vw, 300px);
  scroll-snap-align: start;
  min-width: 0;
}

.pcp-tcard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.pcp-tcard {
  border: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  border-radius: 10px;
  background: #fff;
  padding: 10px;
  min-width: 0;
}

.pcp-tcard--selected {
  border-color: var(--brand-600);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--brand-600) 35%, transparent);
}

.pcp-tcard--suggested {
  border-color: color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pcp-tcard-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}

.pcp-tcard-name {
  margin: 0;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.25;
  word-break: break-word;
}

.pcp-tcard-fav {
  flex-shrink: 0;
  border: none;
  background: transparent;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
  padding: 2px 4px;
}

.pcp-tcard-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.pcp-tcard-pill {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  white-space: nowrap;
}

.pcp-tcard-pill--product {
  border-color: color-mix(in srgb, var(--brand-600) 30%, var(--border));
  color: var(--brand-700);
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
}

.pcp-tcard-pill--muted {
  opacity: 0.85;
}

.pcp-tcard-objective {
  margin: 0 0 6px;
  font-size: 11px;
  line-height: 1.4;
  color: var(--foreground);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pcp-tcard-sections {
  margin: 0 0 6px;
  font-size: 10px;
  line-height: 1.35;
  color: var(--muted);
}

.pcp-tcard-sections-label {
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pcp-tcard-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}

.pcp-tcard-tag {
  font-size: 9px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--foreground) 5%, #fff);
  color: var(--muted);
}

.pcp-tcard-suggest {
  margin: 0 0 8px;
  font-size: 10px;
  color: var(--brand-700);
  line-height: 1.3;
}

.pcp-tcard-actions {
  display: flex;
  gap: 6px;
}

.pcp-tcard-preview,
.pcp-tcard-use {
  flex: 1;
  min-height: 32px;
  font-size: 11px;
  font-weight: 800;
  font-family: inherit;
  border-radius: 8px;
  cursor: pointer;
  padding: 6px 8px;
}

.pcp-tcard-preview {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--foreground);
}

.pcp-tcard-use {
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

.pcp-tcard-preview:active,
.pcp-tcard-use:active {
  opacity: 0.92;
}

.pcp-tcard--dense {
  padding: 7px 8px;
}

.pcp-tcard--dense .pcp-tcard-top {
  margin-bottom: 4px;
}

.pcp-tcard--dense .pcp-tcard-name {
  font-size: 12px;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pcp-tcard--dense .pcp-tcard-meta {
  margin-bottom: 4px;
}

.pcp-tcard--dense .pcp-tcard-objective {
  margin-bottom: 6px;
  font-size: 10px;
  -webkit-line-clamp: 1;
}

.pcp-tcard--dense .pcp-tcard-actions {
  gap: 4px;
}

.pcp-tcard--dense .pcp-tcard-preview,
.pcp-tcard--dense .pcp-tcard-use {
  min-height: 28px;
  padding: 4px 6px;
  font-size: 10px;
}

.pcp-template-search-wrap {
  margin-bottom: 10px;
}

.pcp-template-search {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 16px;
  font-family: inherit;
  background: #fff;
}

.pcp-template-search::placeholder {
  color: var(--muted);
  font-size: 14px;
}

.pcp-template-filter-block {
  margin-bottom: 8px;
}

.pcp-template-more-filters {
  margin: 0 0 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
  overflow: hidden;
}

.pcp-template-more-filters-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 800;
  color: var(--foreground);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.pcp-template-more-filters-summary::-webkit-details-marker {
  display: none;
}

.pcp-template-more-filters-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: var(--brand-600);
  color: #fff;
}

.pcp-template-more-filters-panel {
  padding: 0 10px 10px;
  border-top: 1px solid color-mix(in srgb, var(--foreground) 6%, var(--border));
}

.pcp-template-more-filters-panel .pcp-template-filter-selects {
  margin-bottom: 0;
  padding-top: 8px;
}

.pcp-template-filter-label {
  display: block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  margin-bottom: 6px;
}

.pcp-template-pills {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.pcp-template-pills::-webkit-scrollbar {
  display: none;
}

.pcp-template-pill {
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  min-height: 30px;
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  color: var(--foreground);
  cursor: pointer;
  white-space: nowrap;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pcp-template-pill--active {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 10%, #fff);
  color: var(--brand-700);
}

.pcp-template-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 11px;
  color: var(--muted);
  font-weight: 700;
}

.pcp-template-meta-row label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  flex-shrink: 0;
}

.pcp-template-context-banner {
  margin: 0 0 8px;
  padding: 7px 9px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.4;
  background: color-mix(in srgb, var(--brand-600) 8%, #fff);
  border: 1px solid color-mix(in srgb, var(--brand-600) 22%, var(--border));
  color: var(--foreground);
}

.pcp-template-filter-selects {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  margin-bottom: 0;
}

.pcp-template-filter-selects label {
  display: grid;
  gap: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--muted);
}

.pcp-template-filter-selects select {
  width: 100%;
  min-height: 36px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 8px;
  background: #fff;
}

.pcp-template-section-title {
  margin: 12px 0 6px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.pcp-template-row--suggested {
  border-color: color-mix(in srgb, var(--brand-600) 35%, var(--border));
}

.pcp-template-suggest-reason {
  margin: 4px 0 0;
  font-size: 10px;
  color: var(--brand-700);
  line-height: 1.3;
}

.pcp-template-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.pcp-template-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  padding: 8px 8px;
  border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  border-radius: 8px;
  background: #fff;
}

.pcp-template-row-hit {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.pcp-template-row-hit:active {
  opacity: 0.92;
}

.pcp-template-row:active {
  background: color-mix(in srgb, var(--brand-600) 4%, #fff);
}

.pcp-template-row--selected {
  border-color: var(--brand-600);
  background: color-mix(in srgb, var(--brand-600) 5%, #fff);
}

.pcp-template-row-main {
  min-width: 0;
}

.pcp-template-row-name {
  margin: 0;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.3;
  word-break: break-word;
}

.pcp-template-row-desc {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--muted);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pcp-template-row-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 5px;
}

.pcp-template-badge {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
}

.pcp-template-badge--custom {
  border-color: color-mix(in srgb, var(--brand-600) 25%, var(--border));
  color: var(--brand-700);
}

.pcp-template-row-actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pcp-template-icon-btn {
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  color: var(--muted);
  min-width: 32px;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.pcp-template-icon-btn:active {
  background: color-mix(in srgb, var(--brand-600) 8%, transparent);
}

.pcp-template-preview-head {
  flex-shrink: 0;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.pcp-template-preview-back {
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 800;
  color: var(--brand-700);
  cursor: pointer;
  padding: 4px 0;
  flex-shrink: 0;
}

.pcp-template-preview-title {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.3;
  min-width: 0;
  word-break: break-word;
}

.pcp-template-preview-block {
  margin-bottom: 10px;
}

.pcp-template-preview-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--brand-700);
  margin-bottom: 3px;
}

.pcp-template-preview-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--foreground);
}

.pcp-template-fill-mode {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  font-size: 12px;
  line-height: 1.35;
}

.pcp-template-foot {
  flex-shrink: 0;
  padding: 6px 12px calc(6px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--border);
  background: #fff;
}

.pcp-template-foot-primary,
.pcp-template-foot-skip {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  font-size: 13px;
  font-weight: 800;
  font-family: inherit;
  border-radius: 8px;
  cursor: pointer;
  padding: 8px 12px;
}

.pcp-template-foot-primary {
  border: 1px solid var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

.pcp-template-foot-skip {
  border: 1px solid var(--border);
  background: #fff;
  color: var(--foreground);
}

.pcp-template-foot--sticky {
  position: sticky;
  bottom: 0;
  z-index: 5;
}

.pcp-template-foot-inner {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pcp-template-foot-inner button {
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  font-size: 13px;
  font-weight: 800;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
  cursor: pointer;
  font-family: inherit;
}

.pcp-template-foot-inner button.primary {
  border-color: var(--brand-600);
  background: var(--brand-600);
  color: #fff;
}

.pcp-template-foot-inner button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pcp-template-foot-row {
  display: flex;
  gap: 8px;
}

.pcp-template-foot-row button {
  flex: 1;
}

.pcp-template-alert {
  font-size: 12px;
  color: var(--danger);
  margin: 0 0 8px;
  line-height: 1.35;
}

.pcp-template-empty-compact {
  margin: 4px 0 8px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--muted);
  border-radius: 8px;
  border: 1px dashed var(--border);
  background: color-mix(in srgb, var(--foreground) 2%, #fff);
}

.pcp-template-loading {
  font-size: 12px;
  color: var(--muted);
  margin: 4px 0 8px;
}

.pcp-template-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.pcp-template-actions-row button {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--brand-600) 28%, var(--border));
  background: color-mix(in srgb, var(--brand-600) 6%, #fff);
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
}

.pcp-template-actions-row button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pcp-template-skip-link {
  display: block;
  width: 100%;
  margin-top: 4px;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-700);
  cursor: pointer;
  font-family: inherit;
  text-align: center;
}

.pcp-template-embedded {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-width: 100%;
  overflow: hidden;
}

.pcp-template-picker--preview {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.pcp-template-picker,
.pcp-template-picker * {
  box-sizing: border-box;
}

.pcp-template-embedded .pcp-template-body {
  flex: 1;
  min-height: 200px;
  max-height: min(56dvh, 520px);
}

.pcp-template-embedded .pcp-template-foot--sticky {
  margin-top: auto;
}

.create-engagement-root .pcp-template-foot--sticky {
  display: none;
}

@media (min-width: 480px) {
  .pcp-suggested-slide {
    flex-basis: min(72vw, 280px);
  }
}

@media (min-width: 769px) {
  .pcp-template-picker--embedded .pcp-template-body {
    max-height: none;
  }

  .pcp-template-more-filters-panel .pcp-template-filter-selects {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px 12px;
  }

  .pcp-tcard-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
  }

  .pcp-template-picker--embedded .pcp-suggested-track {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    overflow: visible;
    margin: 0;
  }

  .pcp-template-picker--embedded .pcp-suggested-slide {
    flex: unset;
    min-width: 0;
  }
}

@media (min-width: 1024px) {
  .pcp-tcard-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .pcp-template-picker--embedded .pcp-suggested-track {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }

  .pcp-template-body--browse {
    padding-left: 14px;
    padding-right: 14px;
  }
}

@media (min-width: 1280px) {
  .pcp-tcard-grid,
  .pcp-template-picker--embedded .pcp-suggested-track {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
}
`;
