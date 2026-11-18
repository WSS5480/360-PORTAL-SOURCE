/**
 * Provider overview — semantic visual state tokens.
 * Gray is for metadata only; operational content uses state colors or navy.
 */

import { VALIDATION_GROUP_LABELS } from "@/lib/surgical-sales/buildProviderOverviewBody";

/** CSS custom properties + utility classes (injected with overview body CSS). */
export const providerOverviewStateTokensCss = `
/* ── Semantic state tokens (scoped to overview body) ── */
.pov-body {
  /* Typography — operational vs metadata */
  --pov-text-primary: #0f172a;
  --pov-text-secondary: #1e293b;
  --pov-text-body: #1e293b;
  --pov-text-caption: #64748b;

  /* Needs validation — amber */
  --pov-state-needs-bg: #fffbeb;
  --pov-state-needs-border: #f59e0b;
  --pov-state-needs-text: #78350f;
  --pov-state-needs-label: #b45309;

  /* Confirmed — green */
  --pov-state-confirmed-bg: #ecfdf5;
  --pov-state-confirmed-border: #10b981;
  --pov-state-confirmed-text: #064e3b;
  --pov-state-confirmed-label: #047857;

  /* Still learning — active slate-blue (not disabled gray) */
  --pov-state-learning-bg: #eff6ff;
  --pov-state-learning-border: #60a5fa;
  --pov-state-learning-text: #1e3a8a;
  --pov-state-learning-label: #1d4ed8;

  /* Primary action — confident teal */
  --pov-state-primary-bg: #0f766e;
  --pov-state-primary-bg-top: #0d9488;
  --pov-state-primary-bg-hover: #115e59;
  --pov-state-primary-text: #ffffff;
  --pov-state-primary-border: #0f766e;
  --pov-state-primary-shadow: 0 2px 10px rgba(13, 148, 136, 0.38);
  --pov-state-primary-shadow-hover: 0 4px 16px rgba(13, 148, 136, 0.48);

  /* Secondary action — navy on white */
  --pov-state-secondary-bg: #ffffff;
  --pov-state-secondary-text: #0f172a;
  --pov-state-secondary-border: #94a3b8;
  --pov-state-secondary-border-hover: #0d9488;
  --pov-state-secondary-text-hover: #0f766e;
  --pov-state-secondary-bg-hover: #f0fdfa;

  /* Status / command badge */
  --pov-state-status-bg: #ccfbf1;
  --pov-state-status-border: #2dd4bf;
  --pov-state-status-text: #0f766e;

  /* Scope: facility */
  --pov-state-scope-facility-bg: #e0f2fe;
  --pov-state-scope-facility-border: #38bdf8;
  --pov-state-scope-facility-text: #0369a1;

  /* Scope: provider */
  --pov-state-scope-provider-bg: #ede9fe;
  --pov-state-scope-provider-border: #a78bfa;
  --pov-state-scope-provider-text: #5b21b6;

  color: var(--pov-text-secondary);
}

.pov-state--chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 7px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  border: 1px solid transparent;
}

.pov-state--needs.pov-state--chip {
  color: var(--pov-state-needs-text);
  background: var(--pov-state-needs-bg);
  border-color: var(--pov-state-needs-border);
}

.pov-state--confirmed.pov-state--chip {
  color: var(--pov-state-confirmed-text);
  background: var(--pov-state-confirmed-bg);
  border-color: var(--pov-state-confirmed-border);
}

.pov-state--learning.pov-state--chip {
  color: var(--pov-state-learning-text);
  background: var(--pov-state-learning-bg);
  border-color: var(--pov-state-learning-border);
}

.pov-state--label {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.pov-state--needs.pov-state--label {
  color: var(--pov-state-needs-label);
}

.pov-state--confirmed.pov-state--label {
  color: var(--pov-state-confirmed-label);
}

.pov-state--learning.pov-state--label {
  color: var(--pov-state-learning-label);
}

.pov-state--badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border: 1px solid transparent;
}

.pov-state--status.pov-state--badge {
  color: var(--pov-state-status-text);
  background: var(--pov-state-status-bg);
  border-color: var(--pov-state-status-border);
}

.pov-state--scope-facility.pov-state--badge {
  color: var(--pov-state-scope-facility-text);
  background: var(--pov-state-scope-facility-bg);
  border-color: var(--pov-state-scope-facility-border);
  font-weight: 700;
}

.pov-state--scope-provider.pov-state--badge {
  color: var(--pov-state-scope-provider-text);
  background: var(--pov-state-scope-provider-bg);
  border-color: var(--pov-state-scope-provider-border);
  font-weight: 700;
}

.pov-state--btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-decoration: none;
  border-radius: 9px;
  border: 1px solid transparent;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
}

.pov-state--primary.pov-state--btn {
  min-height: 38px;
  padding: 0 18px;
  font-size: 14px;
  color: var(--pov-state-primary-text);
  background: linear-gradient(
    180deg,
    var(--pov-state-primary-bg-top) 0%,
    var(--pov-state-primary-bg) 100%
  );
  border-color: var(--pov-state-primary-border);
  box-shadow: var(--pov-state-primary-shadow);
}

.pov-state--primary.pov-state--btn:hover {
  background: var(--pov-state-primary-bg-hover);
  border-color: var(--pov-state-primary-bg-hover);
  box-shadow: var(--pov-state-primary-shadow-hover);
  transform: translateY(-1px);
}

.pov-state--secondary.pov-state--btn {
  min-height: 38px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--pov-state-secondary-text);
  background: var(--pov-state-secondary-bg);
  border-color: var(--pov-state-secondary-border);
  cursor: pointer;
  font: inherit;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.pov-state--secondary.pov-state--btn:hover {
  border-color: var(--pov-state-secondary-border-hover);
  color: var(--pov-state-secondary-text-hover);
  background: var(--pov-state-secondary-bg-hover);
}

.pov-state--action.pov-state--btn {
  min-height: 32px;
  min-width: 72px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 12px;
}

.pov-state--action.pov-state--secondary.pov-state--btn {
  color: var(--pov-state-secondary-text);
  background: #fff;
  border-color: var(--pov-state-secondary-border);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.pov-state--action.pov-state--secondary.pov-state--btn:hover {
  background: var(--pov-state-secondary-bg-hover);
  border-color: var(--pov-state-secondary-border-hover);
  color: var(--pov-state-secondary-text-hover);
}

.pov-state--action.pov-state--primary.pov-state--btn {
  color: var(--pov-state-primary-text);
  background: linear-gradient(
    180deg,
    var(--pov-state-primary-bg-top) 0%,
    var(--pov-state-primary-bg) 100%
  );
  border-color: var(--pov-state-primary-border);
  box-shadow: var(--pov-state-primary-shadow);
}

.pov-state--action.pov-state--primary.pov-state--btn:hover {
  background: var(--pov-state-primary-bg-hover);
  border-color: var(--pov-state-primary-bg-hover);
  box-shadow: var(--pov-state-primary-shadow-hover);
  transform: none;
}

.pov-state--index.pov-state--badge {
  min-height: 24px;
  min-width: 24px;
  padding: 0;
  justify-content: center;
  border-radius: 7px;
  font-size: 12px;
  color: var(--pov-state-status-text);
  background: var(--pov-state-status-bg);
  border-color: var(--pov-state-status-border);
}
`;

export type ProviderOverviewSemanticState = "needs" | "confirmed" | "learning";

export const PROVIDER_OVERVIEW_STATE_CLASS = {
  needs: "pov-state--needs",
  confirmed: "pov-state--confirmed",
  learning: "pov-state--learning",
  primary: "pov-state--primary",
  secondary: "pov-state--secondary",
  status: "pov-state--status",
  scopeFacility: "pov-state--scope-facility",
  scopeProvider: "pov-state--scope-provider",
  chip: "pov-state--chip",
  label: "pov-state--label",
  badge: "pov-state--badge",
  btn: "pov-state--btn",
  action: "pov-state--action",
  index: "pov-state--index",
} as const;

export function validationStateFromLabel(label: string): ProviderOverviewSemanticState {
  if (label === VALIDATION_GROUP_LABELS.confirmed) return "confirmed";
  if (label === VALIDATION_GROUP_LABELS.unknown || label === "Still learning") return "learning";
  return "needs";
}

export function stateClasses(
  state: ProviderOverviewSemanticState,
  variant: "chip" | "label",
): string {
  return `${PROVIDER_OVERVIEW_STATE_CLASS[state]} ${PROVIDER_OVERVIEW_STATE_CLASS[variant]}`;
}

export function btnClasses(variant: "primary" | "secondary", compact = false): string {
  const base = `${PROVIDER_OVERVIEW_STATE_CLASS[variant]} ${PROVIDER_OVERVIEW_STATE_CLASS.btn}`;
  return compact ? `${base} ${PROVIDER_OVERVIEW_STATE_CLASS.action}` : base;
}
