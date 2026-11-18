/** Pre-Call Plan field layout on the new-case create flow (mirrors case detail polish). */
export const newCasePreCallPlanCss = `
  .new-case-pre-call-plan {
    display: grid;
    gap: 12px;
  }
  .new-case-pre-call-plan .case-pre-call-plan-fields {
    display: grid;
    gap: 10px;
  }
  .new-case-pre-call-plan .case-pre-call-plan-field {
    display: grid;
    gap: 4px;
  }
  .new-case-pre-call-plan .case-pre-call-plan-label {
    font-size: 12px;
    font-weight: 800;
  }
  .new-case-pre-call-plan .case-pre-call-plan-helper {
    font-size: 10px;
    color: var(--muted);
    line-height: 1.4;
  }
  .new-case-pre-call-plan .case-provider-intel-snapshot--embedded {
    margin: 0;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid color-mix(in srgb, var(--foreground) 8%, var(--border));
    background: color-mix(in srgb, var(--brand-600) 4%, var(--surface));
  }
`;
