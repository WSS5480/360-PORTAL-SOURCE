/**
 * New Engagement wizard — mobile-native layout (≤480px, incl. 390–400px).
 * Desktop/table rules stay in createEngagementWizardCss + min-width media queries.
 */
export const engagementWizardMobileCss = `
@media (max-width: 480px) {
  .create-engagement-root {
    min-height: 100dvh;
  }

  .create-engagement-header {
    padding: 6px 10px 4px;
  }

  .create-engagement-back {
    margin-bottom: 4px;
    font-size: 11px;
  }

  .create-engagement-title {
    font-size: 14px;
  }

  .create-engagement-header-meta {
    font-size: 9px;
  }

  .create-engagement-progress {
    margin-top: 4px;
    height: 2px;
  }

  .create-engagement-segments {
    padding: 0 8px;
    overflow-x: visible;
    flex-wrap: nowrap;
  }

  .create-engagement-segment {
    flex: 1 1 0;
    min-width: 0;
    padding: 6px 4px;
    font-size: 10px;
    text-align: center;
    letter-spacing: -0.01em;
    white-space: normal;
    line-height: 1.2;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-tier--plan-primary {
    order: -1;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-readiness {
    order: -2;
  }

  .create-engagement-body {
    padding: 4px 10px 6px;
    gap: 4px;
  }

  .create-engagement-body--step-preparation,
  .create-engagement-body--preparation {
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    scroll-padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .create-engagement-step-lead {
    display: block;
  }

  .create-engagement-root--mission-launched .create-engagement-details-card-head .create-engagement-step-lead {
    font-size: 13px;
  }

  .create-engagement-context-line {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 700;
  }

  .create-engagement-step-fields {
    gap: 6px;
  }

  .create-engagement-field label {
    font-size: 11px;
  }

  .create-engagement-field input,
  .create-engagement-field select,
  .create-engagement-field textarea {
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 16px;
  }

  .create-engagement-field textarea {
    min-height: 48px;
  }

  .create-engagement-mission-picker {
    gap: 8px;
  }

  .create-engagement-mission-picker__title {
    font-size: 13px;
  }

  .create-engagement-mission-picker__lead {
    font-size: 10px;
  }

  .create-engagement-mission-picker__groups {
    gap: 8px;
  }

  .create-engagement-mission-group {
    gap: 3px;
  }

  .create-engagement-mission-grid {
    grid-template-columns: 1fr;
    gap: 3px;
  }

  .create-engagement-mission-card {
    padding: 5px 7px;
    border-radius: 7px;
    gap: 6px;
    align-items: center;
  }

  .create-engagement-mission-card__icon {
    width: 24px;
    height: 24px;
    font-size: 11px;
    border-radius: 6px;
  }

  .create-engagement-mission-card__name {
    font-size: 11px;
  }

  .create-engagement-mission-card__desc {
    font-size: 9px;
    -webkit-line-clamp: 2;
  }

  .create-engagement-mission-card__workflow {
    font-size: 8px;
  }

  .create-engagement-footer--type-selected,
  .create-engagement-footer--quick-add {
    gap: 5px;
    padding-top: 6px;
  }

  .create-engagement-footer--type-selected .create-engagement-footer-actions,
  .create-engagement-footer--quick-add .create-engagement-footer-actions {
    flex-direction: column;
    gap: 4px;
  }

  .create-engagement-footer--type-selected .create-engagement-footer-actions .primary,
  .create-engagement-footer--type-selected .create-engagement-footer-actions .secondary,
  .create-engagement-footer--quick-add .create-engagement-footer-actions .primary,
  .create-engagement-footer--quick-add .create-engagement-footer-actions .secondary {
    flex: 1 1 100%;
    width: 100%;
    min-height: 36px;
    max-height: 36px;
    order: unset;
    margin-left: 0;
  }

  .create-engagement-footer--type-selected .create-engagement-footer-actions .primary,
  .create-engagement-footer--quick-add .create-engagement-footer-actions .primary {
    order: 1;
  }

  .create-engagement-footer--type-selected .create-engagement-footer-actions .secondary,
  .create-engagement-footer--quick-add .create-engagement-footer-actions .secondary {
    order: 2;
  }

  .create-engagement-mission-preview {
    padding: 6px 8px;
  }

  .create-engagement-mission-preview__title {
    font-size: 11px;
  }

  .create-engagement-mission-preview__purpose,
  .create-engagement-mission-preview__path-note,
  .create-engagement-mission-preview__steps {
    font-size: 8px;
  }

  .create-engagement-mission-preview__paths {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .create-engagement-mission-preview__path {
    padding: 5px 6px;
  }

  .create-engagement-type-groups {
    gap: 8px;
  }

  .create-engagement-type-group-title {
    margin-bottom: 2px;
    font-size: 9px;
  }

  .create-engagement-type-chips {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .create-engagement-type-chip {
    width: 100%;
    max-width: none;
    border-radius: 8px;
    padding: 8px 10px;
    min-height: 36px;
    font-size: 12px;
    text-align: left;
    justify-content: flex-start;
  }

  .create-engagement-alert {
    padding: 8px 10px;
    font-size: 11px;
    border-radius: 8px;
  }

  .create-engagement-grid-2 {
    grid-template-columns: 1fr !important;
  }

  /* Preparation — guidance-first, compact */
  .ew-prep-root {
    gap: 4px;
  }

  .ew-prep-root--strategic {
    display: flex;
    flex-direction: column;
  }

  .ew-prep-workflow-hint--intro {
    display: none;
  }

  .ew-prep-workflow-hint--guidance {
    display: block;
    order: 0;
    margin: 0 0 4px;
    padding: 5px 8px;
    border-radius: 6px;
  }

  .ew-prep-discovery-focus--intro {
    display: none;
  }

  .ew-prep-discovery-focus--guidance {
    display: block;
    order: 0;
    margin: 0 0 4px;
    padding: 6px 8px;
    border-radius: 6px;
  }

  .ew-prep-discovery-focus-title {
    font-size: 10px;
  }

  .ew-prep-discovery-focus-lead {
    font-size: 9px;
  }

  .ew-prep-discovery-focus-sub {
    font-size: 8px;
  }

  .ew-prep-discovery-focus-item {
    padding: 4px 6px;
    gap: 6px;
  }

  .ew-prep-discovery-focus-index {
    width: 16px;
    height: 16px;
    font-size: 8px;
  }

  .ew-prep-discovery-focus-item-title {
    font-size: 9px;
  }

  .ew-prep-discovery-focus-item-desc {
    font-size: 8px;
  }

  .ew-prep-workflow-hint-lead {
    font-size: 10px;
    line-height: 1.3;
  }

  .ew-prep-workflow-hint-sub {
    font-size: 9px;
    margin-top: 2px;
  }

  .ew-prep-context {
    order: 0;
    padding: 5px 8px;
    border-radius: 6px;
    margin: 0;
  }

  .ew-prep-context-line {
    font-size: 11px;
    line-height: 1.3;
  }

  .ew-prep-context-meta {
    margin-top: 2px;
    font-size: 9px;
  }

  .ew-prep-readiness {
    order: 0;
    padding: 5px 8px;
    gap: 3px;
  }

  .ew-prep-readiness-heading {
    font-size: 9px;
  }

  .ew-prep-readiness-signals {
    gap: 3px 8px;
  }

  .ew-prep-readiness-signal {
    font-size: 8px;
  }

  .ew-prep-context {
    margin: 0 0 4px;
    padding: 5px 8px;
  }

  .ew-prep-context-badge {
    font-size: 8px;
    padding: 1px 5px;
  }

  .ew-prep-context-summary {
    font-size: 10px;
    line-height: 1.3;
  }

  .ew-prep-context-focus li {
    font-size: 8px;
    padding: 1px 5px;
  }

  .ew-prep-intro {
    order: 0;
    display: none;
  }

  .ew-prep-step-hint,
  .ew-prep-step-hint--secondary {
    display: none;
  }

  .ew-prep-guidance {
    order: 1;
    gap: 4px;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
  }

  /* Intro Call — mission prep at ~400px (flat sections, minimal chrome) */
  .ew-prep-intro-official--mission {
    gap: 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-tier {
    gap: 4px;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-tier-label,
  .ew-prep-intro-official--mission .ew-prep-intro-tier-label--secondary {
    margin: 0;
    font-size: 9px;
    letter-spacing: 0.04em;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-tier--context .ew-prep-intro-tier-label {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-context-line {
    font-size: 11px;
    font-weight: 700;
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    line-height: 1.3;
  }

  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot {
    padding: 0 0 5px;
    gap: 3px;
    border-bottom-color: color-mix(in srgb, var(--foreground) 10%, var(--border));
  }

  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot-headline {
    font-size: 10px;
  }

  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot-level,
  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot-pct {
    font-size: 9px;
  }

  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot-bar {
    height: 3px;
  }

  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot-chip {
    font-size: 8px;
    padding: 2px 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-readiness-snapshot-complete {
    font-size: 8px;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-tier--plan {
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    gap: 4px;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-head {
    margin-bottom: 2px;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-title {
    font-size: 13px;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-sub {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-cards {
    gap: 0;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card {
    border: none;
    border-radius: 0;
    background: transparent;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card:last-child {
    border-bottom: none;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card-head {
    padding: 6px 0 0;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card-helper,
  .ew-prep-intro-official--mission .ew-prep-call-plan-card-field-hint {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card-title {
    font-size: 10px;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card-body {
    padding: 4px 0 8px;
    gap: 5px;
  }

  .ew-prep-intro-official--mission .ew-prep-call-plan-card-field textarea,
  .ew-prep-intro-official--mission .ew-prep-call-plan-textarea {
    font-size: 16px;
    padding: 6px 8px;
    border-radius: 6px;
    border-color: color-mix(in srgb, var(--foreground) 12%, var(--border));
    min-height: 2.25em;
    max-height: 140px;
  }

  .ew-prep-intro-official--mission .ew-prep-product-focus {
    padding: 0;
    border: none;
    border-radius: 0;
    background: transparent;
    gap: 4px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    padding-bottom: 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-product-focus-preview-summary,
  .ew-prep-intro-official--mission .ew-prep-product-focus-preview-workflow,
  .ew-prep-intro-official--mission .ew-prep-product-focus-opp-hint {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-product-focus-preview-title {
    margin: 0;
    font-size: 9px;
    font-weight: 600;
    color: var(--muted);
  }

  .ew-prep-intro-official--mission .ew-prep-product-focus-label {
    margin-bottom: 2px;
    font-size: 9px;
  }

  .ew-prep-intro-official--mission .ew-prep-product-focus-select {
    font-size: 16px;
    padding: 6px 8px;
    border-radius: 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-conversation-focus {
    gap: 4px;
    padding-bottom: 6px;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  }

  .ew-prep-intro-official--mission .ew-prep-conversation-focus-hint {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-conversation-focus-legend {
    font-size: 9px;
  }

  .ew-prep-intro-official--mission .ew-prep-conversation-focus-chip {
    padding: 7px 12px;
    font-size: 11px;
    min-height: 34px;
    font-weight: 600;
  }

  .ew-prep-intro-official--mission .ew-prep-conversation-focus-chip--active {
    border-color: #0d9488;
    background: #0d9488;
    color: #fff;
    font-weight: 800;
    box-shadow:
      0 0 0 2px color-mix(in srgb, #0d9488 28%, #fff),
      0 2px 4px color-mix(in srgb, #0d9488 35%, transparent);
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs {
    border: none;
    border-radius: 0;
    background: transparent;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
    padding-top: 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-hint--compact {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs--collapsed .ew-prep-ai-recs-compact {
    flex-direction: column;
    align-items: stretch;
    min-height: 0;
    max-height: none;
    padding: 8px 0;
    gap: 8px;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-compact-actions {
    flex-direction: row;
    flex-wrap: wrap;
    width: 100%;
    gap: 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-btn {
    min-height: 36px;
    flex: 1 1 calc(50% - 3px);
    min-width: 7.5rem;
    font-size: 11px;
    line-height: 1.2;
    padding: 6px 10px;
    white-space: normal;
    text-align: center;
    overflow: visible;
    text-overflow: unset;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-btn--primary {
    flex: 1 1 100%;
    min-width: 0;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-btn-label--full {
    display: none;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-btn-label--short {
    display: inline;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-metrics {
    gap: 2px 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-ai-recs-title,
  .ew-prep-intro-official--mission .ew-prep-suggested-prep-title {
    font-size: 10px;
  }

  .ew-prep-intro-official--mission .ew-prep-suggested-prep {
    padding: 8px 0;
    border: none;
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 10%, var(--border));
  }

  .ew-prep-intro-official--mission .ew-prep-suggested-prep-body {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .ew-prep-intro-official--mission .ew-prep-suggested-prep-actions {
    width: 100%;
  }

  .ew-prep-intro-official--mission .ew-prep-prep-flow {
    gap: 8px;
  }

  .ew-prep-intro-official--mission .ew-prep-prep-flow-step {
    gap: 6px 8px;
  }

  .ew-prep-intro-official--mission .ew-prep-intro-tier--secondary {
    gap: 4px;
    padding-top: 6px;
    border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  }

  .ew-prep-intro-official--mission .ew-prep-optional--intro {
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .ew-prep-intro-official--mission .ew-prep-optional-summary {
    padding: 5px 0;
    font-size: 10px;
  }

  .ew-prep-intro-official--mission .ew-prep-optional-body {
    padding: 0 0 4px;
  }

  .ew-prep-ai-recs-review-hint--drawer {
    display: none;
  }

  .ew-prep-ai-recs-sections-notice:first-child {
    display: none;
  }

  .ew-prep-ai-recs-section-card {
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 8px 0;
    border-bottom: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
  }

  .ew-prep-ai-recs-section-card-head {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
  }

  .ew-prep-ai-recs-section-card-title {
    flex: 1 1 100%;
    min-width: 0;
  }

  .ew-prep-ai-recs-section-card-action {
    flex: 1 1 auto;
    min-width: 5.5rem;
    min-height: 34px;
    font-size: 11px;
    padding: 6px 10px;
    white-space: normal;
    line-height: 1.2;
    text-align: center;
  }

  .ew-prep-ai-recs-sections-list {
    gap: 0;
  }

  .ew-prep-ai-recs-review-foot-row {
    flex-direction: column;
  }

  .ew-prep-ai-recs-review-action {
    flex: none;
    width: 100%;
    white-space: normal;
    line-height: 1.25;
    text-align: center;
  }

  .ew-prep-template-preview--embedded .ew-prep-template-preview-sections {
    max-height: 160px;
  }

  .ew-prep-template-preview {
    padding: 8px;
  }

  .ew-prep-template-preview-sections {
    max-height: 200px;
  }

  .ew-prep-template-actions {
    flex-direction: column;
  }

  .ew-prep-template-action {
    width: 100%;
    text-align: center;
  }

  .ew-prep-guidance-empty {
    padding: 4px 0;
    font-size: 10px;
  }

  .ew-prep-status {
    margin: 0 0 4px;
    font-size: 10px;
  }

  .ew-prep-suggestion-card {
    padding: 5px 8px;
    border-radius: 6px;
    border-width: 1px;
  }

  .ew-prep-suggestion-card--priority {
    border-color: color-mix(in srgb, var(--brand-600) 18%, var(--border));
    background: #fff;
  }

  .ew-prep-suggestion-card--subdued {
    padding: 4px 8px;
    background: color-mix(in srgb, var(--foreground) 1%, #fff);
  }

  .ew-prep-card-head {
    margin-bottom: 2px;
    gap: 6px;
  }

  .ew-prep-suggestion-title {
    font-size: 10px;
  }

  .ew-prep-card-action {
    padding: 3px 6px;
    font-size: 9px;
    border-radius: 4px;
  }

  .ew-prep-goal-text {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ew-prep-why-matters {
    margin-top: 4px;
    padding: 4px 6px;
  }

  .ew-prep-why-matters-label {
    font-size: 8px;
    margin-bottom: 1px;
  }

  .ew-prep-why-matters-body {
    font-size: 10px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ew-prep-success-panel {
    padding: 5px 8px;
    border-radius: 6px;
  }

  .ew-prep-success-title {
    font-size: 10px;
    margin-bottom: 1px;
  }

  .ew-prep-success-lead {
    margin: 0 0 3px;
    font-size: 9px;
    line-height: 1.25;
  }

  .ew-prep-success-list {
    gap: 2px;
  }

  .ew-prep-success-list li {
    padding-left: 10px;
    font-size: 9px;
    line-height: 1.25;
  }

  .ew-prep-success-list li::before {
    width: 4px;
    height: 4px;
    top: 0.4em;
  }

  .ew-prep-observation-lead {
    margin: 0 0 3px;
    font-size: 9px;
    line-height: 1.3;
    color: var(--muted);
  }

  .ew-prep-commercialization-item {
    gap: 4px;
    font-size: 10px;
  }

  .ew-prep-commercialization-tag {
    font-size: 7px;
    padding: 1px 4px;
  }

  .ew-prep-talking-list,
  .ew-prep-observation-goals-list,
  .ew-prep-discovery-list {
    padding-left: 14px;
    font-size: 10px;
    line-height: 1.3;
  }

  .ew-prep-talking-list li,
  .ew-prep-observation-goals-list li,
  .ew-prep-discovery-list li {
    margin-bottom: 2px;
  }

  .ew-prep-talking-list li:last-child,
  .ew-prep-observation-goals-list li:last-child,
  .ew-prep-discovery-list li:last-child {
    margin-bottom: 0;
  }

  .ew-prep-opening-text {
    font-size: 11px;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ew-prep-opening-alt {
    display: none;
  }

  .ew-prep-suggestion-meta {
    margin-top: 2px;
    font-size: 9px;
    -webkit-line-clamp: 1;
  }

  .ew-prep-customize {
    order: 2;
    margin: 0;
  }

  .ew-prep-customize:not([open]) .ew-prep-customize-summary {
    padding: 6px 8px;
  }

  .ew-prep-customize-summary {
    padding: 6px 8px;
  }

  .ew-prep-customize-body {
    padding: 0 8px 6px;
  }

  .ew-prep-customize-lead {
    display: none;
  }

  .ew-prep-playbooks-wrap {
    order: 3;
    margin: 0;
  }

  .ew-prep-playbooks-wrap--optional {
    order: 4;
  }

  .ew-prep-guides--optional {
    padding: 0;
    border: none;
    background: transparent;
  }

  .ew-prep-guides-optional-summary {
    padding: 5px 7px;
    font-size: 9px;
  }

  .ew-prep-guides-optional-body {
    padding: 5px 7px 6px;
  }

  .ew-prep-guides-subsection-label {
    font-size: 8px;
  }

  .ew-prep-guides {
    padding: 5px 8px;
    border-radius: 6px;
  }

  .ew-prep-guides-header {
    margin-bottom: 4px;
  }

  .ew-prep-guides-title {
    font-size: 10px;
  }

  .ew-prep-guides-helper {
    font-size: 9px;
    margin-top: 2px;
    -webkit-line-clamp: 2;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .ew-prep-guide-item {
    padding: 4px 0;
  }

  .ew-prep-guide-btn {
    padding: 2px 5px;
    font-size: 8px;
  }

  .ew-prep-more-options {
    display: none;
  }

  .ew-prep-guided-fields {
    gap: 4px;
  }

  .ew-prep-guided-priority {
    gap: 4px;
  }

  .ew-prep-guided-field textarea {
    min-height: 28px;
    max-height: 64px;
    padding: 5px 8px;
    font-size: 16px;
    line-height: 1.3;
  }

  .ew-prep-guided-field-label {
    font-size: 10px;
  }

  .ew-prep-guided-advanced {
    margin-top: 2px;
  }

  .ew-prep-guided-advanced-summary {
    padding: 5px 0;
    font-size: 10px;
  }

  .ew-prep-guided-advanced-body {
    padding: 0 0 4px;
    gap: 4px;
  }

  .ew-prep-lightweight-links {
    gap: 4px;
    margin-bottom: 4px;
  }

  .ew-prep-lightweight-links select {
    padding: 6px 8px;
    font-size: 16px;
  }

  .eng-workflow-fields--compact {
    gap: 4px;
  }

  .eng-workflow-field textarea {
    min-height: 28px;
    max-height: 64px;
  }

  .office-visit-360-plan {
    gap: 3px;
  }

  .office-visit-360-plan > p {
    display: none;
  }

  .office-visit-360-section-summary {
    padding: 5px 8px;
    font-size: 10px;
  }

  .office-visit-360-section-body {
    padding: 0 8px 5px;
  }

  .office-visit-360-section textarea {
    min-height: 28px;
    max-height: 64px;
    font-size: 16px;
  }

  .office-visit-360-section:not([open]) .office-visit-360-section-summary {
    padding: 5px 8px;
  }

  /* Prep footer — single compact action row */
  .create-engagement-footer--prep {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 3px 8px calc(3px + env(safe-area-inset-bottom, 0px));
  }

  .create-engagement-footer--prep .create-engagement-footer-tools {
    display: none;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions {
    display: flex;
    flex: 1 1 100%;
    width: 100%;
    gap: 4px;
    align-items: center;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions .ghost {
    flex: 0 0 auto;
    min-height: 30px;
    max-height: 30px;
    padding: 0 8px;
    font-size: 11px;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions .linkish {
    flex: 0 0 auto;
    min-height: 30px;
    max-height: 30px;
    padding: 0 6px;
    font-size: 10px;
  }

  .create-engagement-footer--prep .create-engagement-footer-actions .primary {
    flex: 1 1 auto;
    min-height: 32px;
    max-height: 32px;
    margin-left: 0;
    font-size: 12px;
    font-weight: 800;
  }

  /* Review */
  .ew-review-root {
    gap: 7px;
  }

  .ew-review-hero {
    padding: 8px 10px;
    border-radius: 8px;
  }

  .ew-review-hero-title {
    font-size: 16px;
  }

  .ew-review-hero-sub {
    font-size: 11px;
  }

  .ew-review-block {
    padding: 8px 10px;
    border-radius: 8px;
  }

  .ew-review-brief-grid {
    gap: 12px;
  }

  .ew-review-readiness-detail {
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--ew-review-border) 55%, transparent);
    padding-left: 0;
  }

  .ew-review-summary-grid {
    grid-template-columns: 1fr !important;
    gap: 5px;
  }

  .ew-review-summary-value {
    font-size: 12px;
  }

  .ew-review-summary-value--emphasis {
    font-size: 13px;
  }

  .ew-review-after {
    padding: 6px 8px;
    font-size: 10px;
  }

  .ew-save-success-hero {
    padding: 8px 10px;
  }

  .ew-save-success-title {
    font-size: 16px;
  }

  .ew-save-success-hint {
    font-size: 10px;
  }

  .create-engagement-footer {
    padding: 4px 10px calc(4px + env(safe-area-inset-bottom, 0px));
  }

  /* Wizard details step (non deep-link) — stacked thumb-friendly footer */
  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    background: color-mix(in srgb, #fff 94%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save .ghost {
    align-self: flex-start;
    width: auto;
    min-height: 30px;
    max-height: 30px;
    order: 0;
    padding: 0 10px 0 4px;
    font-size: 12px;
    font-weight: 700;
    color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
  }

  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save .create-engagement-footer-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save .create-engagement-footer-actions button {
    width: 100%;
    min-height: 44px;
    max-height: none;
    margin-left: 0;
    padding: 0 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 800;
    white-space: normal;
    line-height: 1.25;
    text-align: center;
  }

  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save .create-engagement-footer-actions .primary {
    order: 3;
  }

  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save .create-engagement-footer-actions .secondary:first-of-type {
    order: 1;
  }

  .create-engagement-root:not(.create-engagement-root--mission-launched) .create-engagement-footer--details-save .create-engagement-footer-actions .secondary:last-of-type:not(:first-of-type) {
    order: 2;
  }

  /* Mission launch create screens — full-viewport field setup */
  .create-engagement-root--mission-launched {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    max-height: 100dvh;
    overflow: hidden;
  }

  .create-engagement-root--mission-launched .create-engagement-header {
    padding: 8px 10px 6px;
  }

  .create-engagement-root--mission-launched .create-engagement-title {
    font-size: 15px;
  }

  .create-engagement-root--mission-launched .create-engagement-body--step-details {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    padding-bottom: 0;
    -webkit-overflow-scrolling: touch;
  }

  .create-engagement-root--mission-launched .create-engagement-details-shell {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  .create-engagement-root--mission-launched .create-engagement-details-card {
    flex: 1 1 auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: none;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
  }

  .create-engagement-root--mission-launched .create-engagement-details-card-head {
    padding: 0 0 6px;
  }

  .create-engagement-root--mission-launched .create-engagement-details-card-head .create-engagement-step-lead {
    font-size: 12px;
    line-height: 1.35;
  }

  .create-engagement-root--mission-launched .create-engagement-step-fields {
    flex: 1 1 auto;
    min-height: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-content: start;
    gap: 8px;
    padding: 0;
  }

  .create-engagement-root--mission-launched .create-engagement-field--full,
  .create-engagement-root--mission-launched .create-engagement-schedule-toggle {
    grid-column: 1 / -1;
  }

  .create-engagement-root--mission-launched .create-engagement-field .hint {
    display: none;
  }

  .create-engagement-root--mission-launched .create-engagement-mission-footer-helper {
    display: none;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch {
    flex-shrink: 0;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 12px calc(12px + env(safe-area-inset-bottom, 0px));
    border-top: 1px solid color-mix(in srgb, var(--mission-accent, var(--brand-600)) 16%, var(--border));
    background: color-mix(in srgb, #fff 94%, transparent);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    box-shadow:
      0 -1px 0 color-mix(in srgb, #fff 75%, transparent),
      0 -12px 32px -20px color-mix(in srgb, var(--foreground) 24%, transparent);
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .ghost {
    align-self: flex-start;
    width: auto;
    min-height: 30px;
    max-height: 30px;
    margin: 0;
    padding: 0 10px 0 4px;
    font-size: 12px;
    font-weight: 700;
    color: color-mix(in srgb, var(--foreground) 52%, var(--muted));
    border-radius: 999px;
    border: 1px solid transparent;
    background: transparent;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions button {
    width: 100%;
    min-height: 44px;
    max-height: none;
    margin-left: 0;
    padding: 0 14px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 800;
    letter-spacing: -0.02em;
    white-space: normal;
    line-height: 1.25;
    text-align: center;
    box-shadow: none;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .secondary {
    min-height: 40px;
    background: color-mix(in srgb, #fff 88%, var(--surface));
    border-color: color-mix(in srgb, var(--foreground) 11%, var(--border));
    color: color-mix(in srgb, var(--foreground) 68%, var(--muted));
    font-size: 12px;
    font-weight: 700;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .secondary:first-of-type {
    order: 1;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .secondary:last-of-type:not(:first-of-type) {
    order: 2;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .primary {
    order: 3;
    grid-column: unset;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--mission-accent, var(--brand-600)) 92%, #fff) 0%,
      var(--mission-accent-deep, var(--brand-700)) 100%
    );
    border-color: color-mix(in srgb, var(--mission-accent-deep, var(--brand-700)) 82%, #000);
    color: #fff;
    box-shadow:
      0 1px 0 color-mix(in srgb, #fff 24%, transparent) inset,
      0 10px 24px -14px color-mix(in srgb, var(--mission-accent-deep, var(--brand-700)) 52%, transparent);
  }
}

/* Large phones / small tablets — mission launch footers only (desktop ≥640px unchanged) */
@media (max-width: 639px) and (min-width: 481px) {
  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions button {
    width: 100%;
    min-height: 44px;
    max-height: none;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .primary {
    order: 3;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .secondary:first-of-type {
    order: 1;
  }

  .create-engagement-root--mission-launched .create-engagement-footer--mission-launch .create-engagement-footer-actions .secondary:last-of-type:not(:first-of-type) {
    order: 2;
  }
}
`;
