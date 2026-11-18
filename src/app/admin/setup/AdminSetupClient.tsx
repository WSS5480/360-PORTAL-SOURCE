"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import {
  ADMIN_SETUP_STEP_IDS,
  type AdminSetupSnapshot,
  type AdminSetupStepId,
} from "@/lib/admin/adminSetupTypes";
import type { CompanyWebsiteProductSuggestion } from "@/lib/admin/companyWebsiteSpecialtySuggestions";
import { US_STATE_CODES, US_STATE_TILES, stateName } from "@/lib/admin/usStateTiles";
import { PRE_CALL_PLAN_PRODUCT_LINES } from "@/lib/surgical-sales/preCallPlanTemplateTypes";
import { ENGAGEMENT_TYPES, ENGAGEMENT_TYPE_LABELS } from "@/lib/surgical-sales/engagements/engagementTypes";
import {
  PRE_CALL_PLAN_TEMPLATE_STATUSES,
  PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS,
} from "@/lib/surgical-sales/preCallPlanTemplateStatus";
import UsTerritoryMap from "./UsTerritoryMap";
import SalesCommandDocumentsStep from "./SalesCommandDocumentsStep";
import TeamDirectoryPanel from "./TeamDirectoryPanel";

/* ───────────────────────────── Local persistence ───────────────────────────── */

const PROGRESS_KEY = "360-admin-setup-progress-v2";

type CompanyProfile = {
  companyName: string;
  website: string;
  specialtyFocus: string[];
};

type WebsiteAnalysisResult = {
  siteUrl: string;
  specialties: string[];
  products: CompanyWebsiteProductSuggestion[];
  analyzedAt: string;
  pagesScanned: number;
};

type SetupProgress = {
  reviewedSteps: AdminSetupStepId[];
  company: CompanyProfile | null;
  websiteAnalysis: WebsiteAnalysisResult | null;
};

function loadProgress(): SetupProgress {
  if (typeof window === "undefined") return { reviewedSteps: [], company: null, websiteAnalysis: null };
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { reviewedSteps: [], company: null, websiteAnalysis: null };
    const parsed = JSON.parse(raw) as Partial<SetupProgress>;
    return {
      reviewedSteps: Array.isArray(parsed.reviewedSteps)
        ? parsed.reviewedSteps.filter((s): s is AdminSetupStepId =>
            ADMIN_SETUP_STEP_IDS.includes(s as AdminSetupStepId),
          )
        : [],
      company: parsed.company ?? null,
      websiteAnalysis: parsed.websiteAnalysis ?? null,
    };
  } catch {
    return { reviewedSteps: [], company: null, websiteAnalysis: null };
  }
}

function saveProgress(p: SetupProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
}

/* ───────────────────────────── Styling primitives ───────────────────────────── */

const COLORS = {
  brand: "var(--brand-600)",
  brand700: "var(--brand-700)",
  ink: "#0f172a",
  muted: "#64748b",
  line: "rgba(15,23,42,0.10)",
  lineSoft: "rgba(15,23,42,0.06)",
  surface: "rgba(248,250,252,0.85)",
};

function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    border: `1px solid ${COLORS.line}`,
    borderRadius: 16,
    background: "white",
    boxShadow: "0 8px 22px rgba(15,23,42,0.05)",
    ...extra,
  };
}

function btnPrimary(disabled?: boolean): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 11,
    padding: "10px 16px",
    fontWeight: 900,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    background: disabled ? "rgba(148,163,184,0.4)" : COLORS.brand,
    color: "white",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  };
}

function btnGhost(): React.CSSProperties {
  return {
    border: `1px solid ${COLORS.line}`,
    borderRadius: 11,
    padding: "10px 16px",
    fontWeight: 850,
    fontSize: 13,
    cursor: "pointer",
    background: "white",
    color: COLORS.ink,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: `1px solid ${COLORS.line}`,
  padding: "10px 12px",
  fontSize: 13,
  fontWeight: 600,
  background: "white",
  color: COLORS.ink,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: COLORS.ink, letterSpacing: 0.01 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 12, color: COLORS.muted, lineHeight: 1.5 }}>{hint}</span> : null}
    </label>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: "brand" }) {
  return (
    <div
      style={{
        border: `1px solid ${tone === "brand" ? "rgba(30,136,229,0.2)" : COLORS.line}`,
        borderRadius: 14,
        padding: 14,
        background: tone === "brand" ? "rgba(30,136,229,0.05)" : COLORS.surface,
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 950, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 950, color: COLORS.ink }}>{value}</div>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ready" | "warn" | "brand" }) {
  const map = {
    neutral: { bg: "rgba(148,163,184,0.14)", bd: "rgba(148,163,184,0.3)", fg: "#475569" },
    ready: { bg: "rgba(34,197,94,0.13)", bd: "rgba(34,197,94,0.28)", fg: "#15803d" },
    warn: { bg: "rgba(245,158,11,0.13)", bd: "rgba(245,158,11,0.28)", fg: "#b45309" },
    brand: { bg: "rgba(30,136,229,0.1)", bd: "rgba(30,136,229,0.24)", fg: "var(--brand-700)" },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 900,
        background: map.bg,
        border: `1px solid ${map.bd}`,
        color: map.fg,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        border: "none",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? COLORS.brand : "rgba(148,163,184,0.5)",
        transition: "background 0.15s",
        flexShrink: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "white",
          transition: "left 0.15s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

/* ───────────────────────────── Toasts ───────────────────────────── */

type Toast = { id: number; kind: "success" | "error" | "info"; text: string };

function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((kind: Toast["kind"], text: string, opts?: { sticky?: boolean }) => {
    const id = Date.now() + Math.random();
    const sticky = opts?.sticky ?? kind === "error";
    setToasts((prev) => [...prev, { id, kind, text }]);
    if (!sticky) {
      const ms = kind === "success" ? 4200 : 8000;
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ms);
    }
  }, []);
  const dismiss = React.useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, push, dismiss };
}

function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, display: "grid", gap: 10, zIndex: 9999, maxWidth: 380 }}>
      {toasts.map((t) => {
        const tone =
          t.kind === "success"
            ? { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#166534", icon: "✓" }
            : t.kind === "error"
              ? { bg: "#fef2f2", bd: "#fecaca", fg: "#b91c1c", icon: "!" }
              : { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8", icon: "i" };
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "start",
              gap: 10,
              background: tone.bg,
              border: `1px solid ${tone.bd}`,
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 10px 30px rgba(15,23,42,0.14)",
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: tone.fg,
                color: "white",
                fontWeight: 950,
                fontSize: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {tone.icon}
            </span>
            <div style={{ fontSize: 13, fontWeight: 800, color: tone.fg, lineHeight: 1.45, flex: 1 }}>{t.text}</div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              style={{ border: "none", background: "transparent", color: tone.fg, cursor: "pointer", fontWeight: 950 }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── API helper ───────────────────────────── */

async function apiJson<T = any>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || (json && json.ok === false)) {
    throw new Error((json && (json.error?.message || json.error)) || `Request failed (${res.status})`);
  }
  return json as T;
}

/* ───────────────────────────── Step metadata ───────────────────────────── */

const STEP_META: Record<AdminSetupStepId, { label: string; short: string; blurb: string; icon: string }> = {
  company: { label: "Company", short: "Company", blurb: "Organization profile and surgical specialty focus.", icon: "🏢" },
  products: { label: "Products", short: "Products", blurb: "Sales product families used across the platform.", icon: "📦" },
  playbooks: { label: "Playbooks", short: "Playbooks", blurb: "Pre-call and visit templates reps run in the field.", icon: "📋" },
  documents: { label: "Documents", short: "Documents", blurb: "Resource library reps access in Sales Command.", icon: "📁" },
  territories: { label: "Territories & Facilities", short: "Territories", blurb: "Where your team sells and the facilities you cover.", icon: "🗺️" },
  users: { label: "Team & Access", short: "Users", blurb: "Invite teammates and manage roles.", icon: "👥" },
  intelligence: { label: "Leaderboard scoring", short: "Leaderboard", blurb: "Configure how reps earn points on the sales leaderboard.", icon: "🏆" },
  review: { label: "Review & Launch", short: "Review", blurb: "Confirm your configuration is ready.", icon: "🚀" },
};

const CONFIG_STEPS = ADMIN_SETUP_STEP_IDS.filter((s) => s !== "review");

/* ───────────────────────────── Main component ───────────────────────────── */

export default function AdminSetupClient({
  initialSnapshot,
}: {
  initialSnapshot: AdminSetupSnapshot;
}) {
  const searchParams = useSearchParams();
  const { toasts, push, dismiss } = useToasts();

  const [snapshot, setSnapshot] = React.useState(initialSnapshot);
  const [progress, setProgress] = React.useState<SetupProgress>({ reviewedSteps: [], company: null, websiteAnalysis: null });
  const [step, setStep] = React.useState<AdminSetupStepId>("company");
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    setProgress(loadProgress());
    const mode = searchParams.get("mode");
    const qStep = searchParams.get("step");
    if (mode === "review") setStep("review");
    else if (qStep && ADMIN_SETUP_STEP_IDS.includes(qStep as AdminSetupStepId)) setStep(qStep as AdminSetupStepId);
  }, [searchParams]);

  const company: CompanyProfile = progress.company ?? {
    companyName: "360 Medical",
    website: "",
    specialtyFocus: snapshot.company.specialtyCategories,
  };

  const persist = React.useCallback((next: SetupProgress) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  const markReviewed = React.useCallback(
    (s: AdminSetupStepId) => {
      setProgress((prev) => {
        if (prev.reviewedSteps.includes(s)) return prev;
        const next = { ...prev, reviewedSteps: [...prev.reviewedSteps, s] };
        saveProgress(next);
        return next;
      });
    },
    [],
  );

  const refreshSnapshot = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await apiJson<{ snapshot: AdminSetupSnapshot }>("/api/admin/setup/snapshot", "GET");
      setSnapshot(data.snapshot);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not refresh");
    } finally {
      setRefreshing(false);
    }
  }, [push]);

  function goTo(s: AdminSetupStepId) {
    setStep(s);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function next() {
    markReviewed(step);
    const i = ADMIN_SETUP_STEP_IDS.indexOf(step);
    goTo(ADMIN_SETUP_STEP_IDS[Math.min(i + 1, ADMIN_SETUP_STEP_IDS.length - 1)]);
  }

  function back() {
    const i = ADMIN_SETUP_STEP_IDS.indexOf(step);
    goTo(ADMIN_SETUP_STEP_IDS[Math.max(i - 1, 0)]);
  }

  const reviewedCount = CONFIG_STEPS.filter((s) => progress.reviewedSteps.includes(s)).length;
  const percent = Math.round((reviewedCount / CONFIG_STEPS.length) * 100);

  const sharedProps = { snapshot, push, refreshSnapshot, refreshing, onNext: next, onBack: back, goTo };

  return (
    <div style={{ width: "100%", maxWidth: 1240, margin: "0 auto" }}>
      <ToastHost toasts={toasts} dismiss={dismiss} />

      {/* Hero */}
      <section
        style={{
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(30,136,229,0.22)",
          background:
            "radial-gradient(900px 240px at 12% 0%, rgba(56,189,248,0.4), transparent 60%)," +
            "linear-gradient(180deg, #0a1b36, #060e1b)",
          color: "white",
          padding: "22px 24px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 280 }}>
            <h1 style={{ margin: 0, fontSize: 27, fontWeight: 950, letterSpacing: -0.4 }}>
              Portal setup
            </h1>
          </div>
          <div style={{ minWidth: 200, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
              <span>Setup progress</span>
              <span>{percent}%</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${percent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #38bdf8, #22d3ee)",
                  borderRadius: 999,
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ fontSize: 11.5, opacity: 0.78, fontWeight: 700 }}>
              {reviewedCount} of {CONFIG_STEPS.length} sections reviewed
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "248px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
        {/* Step rail */}
        <nav style={{ ...card(), padding: 10, position: "sticky", top: 12, display: "grid", gap: 4 }}>
          {ADMIN_SETUP_STEP_IDS.map((s, i) => {
            const active = step === s;
            const done =
              s === "review"
                ? CONFIG_STEPS.every((c) => progress.reviewedSteps.includes(c))
                : progress.reviewedSteps.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => goTo(s)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  textAlign: "left",
                  border: "none",
                  borderRadius: 11,
                  padding: "10px 11px",
                  cursor: "pointer",
                  background: active ? "rgba(30,136,229,0.1)" : "transparent",
                  color: active ? COLORS.brand700 : COLORS.ink,
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 950,
                    flexShrink: 0,
                    background: done ? "#22c55e" : active ? COLORS.brand : "rgba(148,163,184,0.25)",
                    color: done || active ? "white" : "#64748b",
                  }}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 900 }}>{STEP_META[s].short}</span>
                  <span style={{ fontSize: 10.5, color: COLORS.muted, fontWeight: 700 }}>
                    {done ? "Reviewed" : active ? "In progress" : "Not started"}
                  </span>
                </span>
              </button>
            );
          })}
          <div style={{ borderTop: `1px solid ${COLORS.lineSoft}`, margin: "6px 4px 2px", paddingTop: 8 }}>
            <button
              type="button"
              onClick={refreshSnapshot}
              disabled={refreshing}
              style={{ ...btnGhost(), width: "100%", fontSize: 12, padding: "8px 10px" }}
            >
              {refreshing ? "Refreshing…" : "↻ Refresh live data"}
            </button>
          </div>
        </nav>

        {/* Main panel */}
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {step === "company" ? (
            <CompanyStep
              {...sharedProps}
              company={company}
              onSaveCompany={(c) => { persist({ ...progress, company: c }); push("success", "Company profile saved"); }}
              onWebsiteAnalyzed={(analysis) => persist({ ...progress, websiteAnalysis: analysis })}
            />
          ) : null}
          {step === "products" ? (
            <ProductsStep
              {...sharedProps}
              websiteAnalysis={progress.websiteAnalysis}
              onClearWebsiteAnalysis={() => persist({ ...progress, websiteAnalysis: null })}
            />
          ) : null}
          {step === "playbooks" ? <PlaybooksStep {...sharedProps} /> : null}
          {step === "documents" ? (
            <StepShell id="documents" onNext={next} onBack={back}>
              <SalesCommandDocumentsStep snapshot={snapshot} push={push} refreshSnapshot={refreshSnapshot} />
            </StepShell>
          ) : null}
          {step === "territories" ? <TerritoriesStep {...sharedProps} /> : null}
          {step === "users" ? <UsersStep {...sharedProps} /> : null}
          {step === "intelligence" ? <IntelligenceStep {...sharedProps} /> : null}
          {step === "review" ? <ReviewStep {...sharedProps} company={company} markReviewed={markReviewed} /> : null}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Step shell ───────────────────────────── */

type SharedProps = {
  snapshot: AdminSetupSnapshot;
  push: (kind: Toast["kind"], text: string) => void;
  refreshSnapshot: () => Promise<void>;
  refreshing: boolean;
  onNext: () => void;
  onBack: () => void;
  goTo: (s: AdminSetupStepId) => void;
};

function StepShell({
  id,
  children,
  onNext,
  onBack,
  nextLabel = "Save & continue",
}: {
  id: AdminSetupStepId;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  nextLabel?: string;
}) {
  const meta = STEP_META[id];
  const isFirst = ADMIN_SETUP_STEP_IDS.indexOf(id) === 0;
  const stepIndex = ADMIN_SETUP_STEP_IDS.indexOf(id) + 1;
  return (
    <section style={{ ...card(), padding: 0, display: "grid", overflow: "hidden" }}>
      <header
        style={{
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
          padding: "20px 22px",
          borderBottom: `1px solid ${COLORS.lineSoft}`,
          background: "linear-gradient(180deg, rgba(248,250,252,0.95), #ffffff)",
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(30,136,229,0.07)",
            border: "1px solid rgba(30,136,229,0.14)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
            color: COLORS.brand700,
            flexShrink: 0,
            letterSpacing: 0.04,
          }}
        >
          {String(stepIndex).padStart(2, "0")}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: COLORS.ink, letterSpacing: -0.2 }}>{meta.label}</h2>
          <p style={{ margin: "5px 0 0", fontSize: 13.5, color: COLORS.muted, lineHeight: 1.45 }}>{meta.blurb}</p>
        </div>
      </header>
      <div style={{ padding: "20px 22px", display: "grid", gap: 16 }}>{children}</div>
      <footer
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          borderTop: `1px solid ${COLORS.lineSoft}`,
          padding: "16px 22px",
          flexWrap: "wrap",
          background: "rgba(248,250,252,0.55)",
        }}
      >
        <button type="button" style={{ ...btnGhost(), visibility: isFirst ? "hidden" : "visible" }} onClick={onBack}>
          ← Back
        </button>
        <button type="button" style={btnPrimary()} onClick={onNext}>
          {nextLabel} →
        </button>
      </footer>
    </section>
  );
}

function SubCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${COLORS.line}`, borderRadius: 12, overflow: "hidden", background: "white" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          padding: "13px 16px",
          borderBottom: `1px solid ${COLORS.lineSoft}`,
          background: "rgba(248,250,252,0.65)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.ink, letterSpacing: -0.01 }}>{title}</div>
        {action}
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

/* ───────────────────────────── Company step ───────────────────────────── */

const specialtyChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 10px",
  borderRadius: 8,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: 12.5,
  fontWeight: 600,
  color: "#334155",
};

function CompanyContextBar({ snapshot }: { snapshot: AdminSetupSnapshot }) {
  const items = [
    { label: "product families", value: snapshot.company.salesProductCount },
    { label: "facilities", value: snapshot.territories.totalFacilities },
    { label: "sales reps", value: snapshot.users.salesRepCount },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "6px 16px",
        padding: "11px 14px",
        borderRadius: 10,
        background: COLORS.surface,
        border: `1px solid ${COLORS.lineSoft}`,
        fontSize: 12.5,
        color: COLORS.muted,
        lineHeight: 1.45,
      }}
    >
      <span style={{ fontWeight: 700, color: "#475569" }}>Current platform data</span>
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index === 0 ? null : <span aria-hidden style={{ opacity: 0.35 }}>·</span>}
          <span>
            <strong style={{ color: COLORS.ink, fontWeight: 700 }}>{item.value}</strong> {item.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function CompanyStep({
  snapshot,
  company,
  onSaveCompany,
  onWebsiteAnalyzed,
  onNext,
  onBack,
  push,
}: SharedProps & {
  company: CompanyProfile;
  onSaveCompany: (c: CompanyProfile) => void;
  onWebsiteAnalyzed: (analysis: WebsiteAnalysisResult) => void;
}) {
  const [draft, setDraft] = React.useState<CompanyProfile>({ ...company, website: company.website ?? "" });
  const [focusInput, setFocusInput] = React.useState("");
  const [suggesting, setSuggesting] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<string[] | null>(null);

  function addFocus(value?: string) {
    const v = (value ?? focusInput).trim();
    if (!v || draft.specialtyFocus.includes(v)) return;
    setDraft((d) => ({ ...d, specialtyFocus: [...d.specialtyFocus, v] }));
    if (!value) setFocusInput("");
  }

  async function generateSuggestions() {
    if (!draft.website.trim()) {
      push("error", "Enter a website to pull suggestions");
      return;
    }
    setSuggesting(true);
    setSuggestions(null);
    try {
      const res = await apiJson<{
        suggestions: string[];
        productSuggestions: CompanyWebsiteProductSuggestion[];
        siteUrl: string;
        pagesScanned: number;
      }>("/api/admin/setup/company-suggestions", "POST", {
        website: draft.website.trim(),
        companyName: draft.companyName.trim(),
      });
      setSuggestions(res.suggestions);
      onWebsiteAnalyzed({
        siteUrl: res.siteUrl,
        specialties: res.suggestions,
        products: res.productSuggestions,
        analyzedAt: new Date().toISOString(),
        pagesScanned: res.pagesScanned,
      });
      if (!res.suggestions.length && !res.productSuggestions.length) {
        push("info", "No specialty or product signals found on that site — add them manually.");
      } else {
        const parts: string[] = [];
        if (res.suggestions.length) {
          parts.push(`${res.suggestions.length} specialt${res.suggestions.length === 1 ? "y" : "ies"}`);
        }
        if (res.productSuggestions.length) {
          parts.push(`${res.productSuggestions.length} product${res.productSuggestions.length === 1 ? "" : "s"}`);
        }
        push("success", `Found ${parts.join(" and ")} — review products on the next step.`);
      }
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not analyze the website");
    } finally {
      setSuggesting(false);
    }
  }

  const newSuggestions = (suggestions ?? []).filter((s) => !draft.specialtyFocus.includes(s));

  return (
    <StepShell id="company" onNext={() => { onSaveCompany(draft); onNext(); }} onBack={onBack}>
      <CompanyContextBar snapshot={snapshot} />

      <SubCard title="Organization details">
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Company name">
            <input
              style={inputStyle}
              placeholder="Your organization name"
              value={draft.companyName}
              onChange={(e) => setDraft({ ...draft, companyName: e.target.value })}
            />
          </Field>

          <Field
            label="Website"
            hint="We scan the homepage and linked product pages to infer specialties and product lines. Product suggestions appear on the Products step."
          >
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                placeholder="example.com"
                value={draft.website}
                onChange={(e) => setDraft({ ...draft, website: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void generateSuggestions();
                  }
                }}
              />
              <button
                type="button"
                style={{
                  ...btnGhost(),
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  borderColor: "rgba(30,136,229,0.28)",
                  color: COLORS.brand700,
                  fontWeight: 800,
                }}
                disabled={suggesting}
                onClick={generateSuggestions}
              >
                {suggesting ? "Analyzing…" : "Analyze website"}
              </button>
            </div>
          </Field>
        </div>
      </SubCard>

      {suggestions !== null ? (
        <SubCard
          title="Suggested specialties"
          action={
            newSuggestions.length ? (
              <button
                type="button"
                style={{ ...btnGhost(), padding: "6px 12px", fontSize: 12, fontWeight: 800 }}
                onClick={() => newSuggestions.forEach((s) => addFocus(s))}
              >
                Add all
              </button>
            ) : null
          }
        >
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5 }}>
            Inferred from <span style={{ fontWeight: 700, color: "#475569" }}>{draft.website.trim()}</span>
          </p>
          {newSuggestions.length ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {newSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => addFocus(s)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 11px",
                    borderRadius: 8,
                    background: "white",
                    border: "1px dashed rgba(30,136,229,0.35)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: COLORS.brand700,
                    cursor: "pointer",
                  }}
                >
                  <span aria-hidden style={{ fontSize: 14, lineHeight: 1, opacity: 0.7 }}>+</span>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: COLORS.surface,
                border: `1px solid ${COLORS.lineSoft}`,
                fontSize: 13,
                color: COLORS.muted,
                lineHeight: 1.5,
              }}
            >
              {suggestions.length
                ? "All suggested specialties are already in your focus list."
                : "No specialty signals were detected. Add specialties manually below."}
            </div>
          )}
        </SubCard>
      ) : null}

      <SubCard
        title="Specialty focus"
        action={
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.muted }}>
            {draft.specialtyFocus.length} selected
          </span>
        }
      >
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5 }}>
          Preloaded from your sales product categories. Add any additional surgical areas your team sells into.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, minHeight: 28 }}>
          {draft.specialtyFocus.length ? (
            draft.specialtyFocus.map((f) => (
              <span key={f} style={specialtyChipStyle}>
                {f}
                <button
                  type="button"
                  aria-label={`Remove ${f}`}
                  onClick={() => setDraft({ ...draft, specialtyFocus: draft.specialtyFocus.filter((x) => x !== f) })}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    color: "#64748b",
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: 1,
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </span>
            ))
          ) : (
            <span style={{ fontSize: 13, color: COLORS.muted }}>No specialties added yet.</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            placeholder="e.g. General Surgery"
            value={focusInput}
            onChange={(e) => setFocusInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFocus();
              }
            }}
          />
          <button type="button" style={{ ...btnGhost(), flexShrink: 0, fontWeight: 800 }} onClick={() => addFocus()}>
            Add specialty
          </button>
        </div>
      </SubCard>
    </StepShell>
  );
}

/* ───────────────────────────── Products step ───────────────────────────── */

function normalizeProductName(name: string): string {
  return name.trim().toLowerCase();
}

function ProductsStep({
  snapshot,
  push,
  refreshSnapshot,
  websiteAnalysis,
  onClearWebsiteAnalysis,
  onNext,
  onBack,
}: SharedProps & {
  websiteAnalysis: WebsiteAnalysisResult | null;
  onClearWebsiteAnalysis: () => void;
}) {
  const [adding, setAdding] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [addingSuggestionKey, setAddingSuggestionKey] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", category: "", description: "", active: true });

  const existingProductKeys = React.useMemo(
    () => new Set(snapshot.products.map((product) => normalizeProductName(product.name))),
    [snapshot.products],
  );

  const pendingProductSuggestions = React.useMemo(
    () =>
      (websiteAnalysis?.products ?? []).filter(
        (product) => !existingProductKeys.has(normalizeProductName(product.name)),
      ),
    [websiteAnalysis?.products, existingProductKeys],
  );

  function startAdd(prefill?: { name: string; category: string; description?: string }) {
    setForm({
      name: prefill?.name ?? "",
      category: prefill?.category ?? "",
      description: prefill?.description ?? "",
      active: true,
    });
    setEditId(null);
    setAdding(true);
  }
  function startEdit(p: AdminSetupSnapshot["products"][number]) {
    setForm({ name: p.name, category: p.category ?? "", description: "", active: p.active });
    setEditId(p.id);
    setAdding(true);
  }

  async function save() {
    if (!form.name.trim()) {
      push("error", "Product name is required");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        await apiJson("/api/admin/setup/products", "PATCH", { id: editId, ...form });
        push("success", `Updated “${form.name}”`);
      } else {
        await apiJson("/api/admin/setup/products", "POST", form);
        push("success", `Added “${form.name}”`);
      }
      setAdding(false);
      setEditId(null);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function addSuggestedProduct(product: CompanyWebsiteProductSuggestion) {
    const key = normalizeProductName(product.name);
    setAddingSuggestionKey(key);
    try {
      await apiJson("/api/admin/setup/products", "POST", {
        name: product.name,
        category: product.specialty,
        description: product.description ?? "",
        active: true,
      });
      push("success", `Added “${product.name}”`);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not add product");
    } finally {
      setAddingSuggestionKey(null);
    }
  }

  async function addAllSuggestedProducts() {
    if (!pendingProductSuggestions.length) return;
    setBusy(true);
    let added = 0;
    try {
      for (const product of pendingProductSuggestions) {
        await apiJson("/api/admin/setup/products", "POST", {
          name: product.name,
          category: product.specialty,
          description: product.description ?? "",
          active: true,
        });
        added += 1;
      }
      push("success", `Added ${added} product${added === 1 ? "" : "s"} from website analysis`);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not add all products");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(p: AdminSetupSnapshot["products"][number]) {
    setBusy(true);
    try {
      await apiJson("/api/admin/setup/products", "PATCH", { id: p.id, active: !p.active });
      push("success", `${p.name} ${!p.active ? "activated" : "deactivated"}`);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell id="products" onNext={onNext} onBack={onBack}>
      {websiteAnalysis ? (
        <SubCard
          title={`Suggested from website (${pendingProductSuggestions.length})`}
          action={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {pendingProductSuggestions.length ? (
                <button type="button" style={{ ...btnGhost(), padding: "6px 12px", fontSize: 12, fontWeight: 800 }} disabled={busy} onClick={addAllSuggestedProducts}>
                  Add all
                </button>
              ) : null}
              <button type="button" style={{ ...btnGhost(), padding: "6px 12px", fontSize: 12, fontWeight: 800 }} onClick={onClearWebsiteAnalysis}>
                Dismiss
              </button>
            </div>
          }
        >
          <p style={{ margin: "0 0 14px", fontSize: 12.5, color: COLORS.muted, lineHeight: 1.5 }}>
            Detected from{" "}
            <span style={{ fontWeight: 700, color: "#475569" }}>{websiteAnalysis.siteUrl}</span>
            {websiteAnalysis.pagesScanned > 1 ? ` · ${websiteAnalysis.pagesScanned} pages scanned` : ""}. Each product
            includes a suggested specialty category.
          </p>
          {pendingProductSuggestions.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {pendingProductSuggestions.map((product) => {
                const key = normalizeProductName(product.name);
                const isAdding = addingSuggestionKey === key;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      border: `1px solid ${COLORS.lineSoft}`,
                      borderRadius: 10,
                      background: "rgba(248,250,252,0.65)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: COLORS.ink }}>{product.name}</div>
                      {product.description ? (
                        <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 3, lineHeight: 1.45 }}>{product.description}</div>
                      ) : null}
                    </div>
                    <Pill tone="brand">{product.specialty}</Pill>
                    <button
                      type="button"
                      style={{ ...btnGhost(), padding: "7px 12px", fontSize: 12, fontWeight: 800 }}
                      disabled={isAdding || busy}
                      onClick={() => addSuggestedProduct(product)}
                    >
                      {isAdding ? "Adding…" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: COLORS.surface,
                border: `1px solid ${COLORS.lineSoft}`,
                fontSize: 13,
                color: COLORS.muted,
                lineHeight: 1.5,
              }}
            >
              All suggested products are already in your catalog.
            </div>
          )}
        </SubCard>
      ) : null}

      <SubCard
        title={`Sales products (${snapshot.products.length})`}
        action={
          <button type="button" style={btnPrimary()} onClick={() => startAdd()}>
            + Add product
          </button>
        }
      >
        {adding ? (
          <div style={{ display: "grid", gap: 12, marginBottom: 16, padding: 14, background: COLORS.surface, borderRadius: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <Field label="Product name">
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Category" hint="Clinical specialty this product serves">
                <input style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 850 }}>
                <Toggle on={form.active} onChange={(v) => setForm({ ...form, active: v })} /> Active
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btnGhost()} onClick={() => setAdding(false)}>
                  Cancel
                </button>
                <button type="button" style={btnPrimary(busy)} disabled={busy} onClick={save}>
                  {busy ? "Saving…" : editId ? "Save changes" : "Add product"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {snapshot.products.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {snapshot.products.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  border: `1px solid ${COLORS.lineSoft}`,
                  borderRadius: 11,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>{p.category || "Uncategorized"}</div>
                </div>
                <Pill tone={p.active ? "ready" : "neutral"}>{p.active ? "Active" : "Inactive"}</Pill>
                <Toggle on={p.active} onChange={() => toggleActive(p)} />
                <button type="button" style={{ ...btnGhost(), padding: "7px 12px" }} onClick={() => startEdit(p)}>
                  Edit
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: COLORS.muted }}>No sales products yet — add your first above.</span>
        )}
      </SubCard>
    </StepShell>
  );
}

/* ───────────────────────────── Playbooks step ───────────────────────────── */

type PlaybookForm = {
  name: string;
  productLine: string;
  engagementType: string;
  status: string;
  description: string;
  smartObjective: string;
  openingStatement: string;
  probes: string;
  plannedClose: string;
  suggestedNextStep: string;
};

const EMPTY_PLAYBOOK: PlaybookForm = {
  name: "",
  productLine: PRE_CALL_PLAN_PRODUCT_LINES[0],
  engagementType: "intro_call",
  status: "active",
  description: "",
  smartObjective: "",
  openingStatement: "",
  probes: "",
  plannedClose: "",
  suggestedNextStep: "",
};

function PlaybooksStep({ snapshot, push, refreshSnapshot, onNext, onBack }: SharedProps) {
  const [adding, setAdding] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loadingEdit, setLoadingEdit] = React.useState(false);
  const [form, setForm] = React.useState<PlaybookForm>(EMPTY_PLAYBOOK);

  function startAdd() {
    setForm(EMPTY_PLAYBOOK);
    setEditId(null);
    setAdding(true);
  }

  async function startEdit(id: string) {
    setLoadingEdit(true);
    setEditId(id);
    setAdding(true);
    try {
      const data = await apiJson<{ playbook: any }>(`/api/admin/sales/playbooks/${id}`, "GET");
      const p = data.playbook;
      setForm({
        name: p.name ?? "",
        productLine: p.productLine ?? PRE_CALL_PLAN_PRODUCT_LINES[0],
        engagementType: p.engagementType ?? "intro_call",
        status: p.status ?? "active",
        description: p.description ?? "",
        smartObjective: p.smartObjective ?? "",
        openingStatement: p.openingStatement ?? "",
        probes: p.probes ?? "",
        plannedClose: p.plannedClose ?? "",
        suggestedNextStep: p.suggestedNextStep ?? "",
      });
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not load playbook");
      setAdding(false);
    } finally {
      setLoadingEdit(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      push("error", "Playbook name is required");
      return;
    }
    const hasContent = [form.smartObjective, form.openingStatement, form.probes, form.plannedClose, form.suggestedNextStep]
      .some((v) => v.trim());
    if (!hasContent) {
      push("error", "Add at least one plan field (objective, opening, probes, close, or next step).");
      return;
    }
    setBusy(true);
    try {
      if (editId) {
        await apiJson(`/api/admin/sales/playbooks/${editId}`, "PATCH", form);
        push("success", `Updated “${form.name}”`);
      } else {
        await apiJson("/api/admin/sales/playbooks", "POST", form);
        push("success", `Created “${form.name}”`);
      }
      setAdding(false);
      setEditId(null);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: string, status: string, name: string) {
    setBusy(true);
    try {
      await apiJson(`/api/admin/sales/playbooks/${id}/status`, "POST", { status });
      push("success", `“${name}” → ${PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS[status as keyof typeof PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS]}`);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Status change failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell id="playbooks" onNext={onNext} onBack={onBack}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatTile label="Total templates" value={String(snapshot.playbooks.total)} />
        <StatTile label="Active" value={String(snapshot.playbooks.activeCount)} tone="brand" />
        <StatTile label="System (synced)" value={`${snapshot.playbooks.systemCount}/${snapshot.playbooks.systemSeedCount}`} />
      </div>

      <SubCard
        title="Playbooks"
        action={
          <button type="button" style={btnPrimary()} onClick={startAdd}>
            + Add playbook
          </button>
        }
      >
        {adding ? (
          <div style={{ display: "grid", gap: 12, marginBottom: 16, padding: 14, background: COLORS.surface, borderRadius: 12 }}>
            {loadingEdit ? (
              <div style={{ fontSize: 13, color: COLORS.muted }}>Loading playbook…</div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  <Field label="Name">
                    <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </Field>
                  <Field label="Product line">
                    <select style={inputStyle} value={form.productLine} onChange={(e) => setForm({ ...form, productLine: e.target.value })}>
                      {PRE_CALL_PLAN_PRODUCT_LINES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Engagement">
                    <select style={inputStyle} value={form.engagementType} onChange={(e) => setForm({ ...form, engagementType: e.target.value })}>
                      {ENGAGEMENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {ENGAGEMENT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Status">
                    <select style={inputStyle} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      {PRE_CALL_PLAN_TEMPLATE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Description">
                  <input style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </Field>
                <Field label="SMART objective">
                  <textarea style={{ ...inputStyle, minHeight: 54, resize: "vertical" }} value={form.smartObjective} onChange={(e) => setForm({ ...form, smartObjective: e.target.value })} />
                </Field>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  <Field label="Opening statement">
                    <textarea style={{ ...inputStyle, minHeight: 54, resize: "vertical" }} value={form.openingStatement} onChange={(e) => setForm({ ...form, openingStatement: e.target.value })} />
                  </Field>
                  <Field label="Discovery probes">
                    <textarea style={{ ...inputStyle, minHeight: 54, resize: "vertical" }} value={form.probes} onChange={(e) => setForm({ ...form, probes: e.target.value })} />
                  </Field>
                  <Field label="Planned close">
                    <textarea style={{ ...inputStyle, minHeight: 54, resize: "vertical" }} value={form.plannedClose} onChange={(e) => setForm({ ...form, plannedClose: e.target.value })} />
                  </Field>
                  <Field label="Suggested next step">
                    <textarea style={{ ...inputStyle, minHeight: 54, resize: "vertical" }} value={form.suggestedNextStep} onChange={(e) => setForm({ ...form, suggestedNextStep: e.target.value })} />
                  </Field>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <button type="button" style={btnGhost()} onClick={() => setAdding(false)}>
                    Cancel
                  </button>
                  <button type="button" style={btnPrimary(busy)} disabled={busy} onClick={save}>
                    {busy ? "Saving…" : editId ? "Save changes" : "Create playbook"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {snapshot.playbooks.items.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {snapshot.playbooks.items.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  border: `1px solid ${COLORS.lineSoft}`,
                  borderRadius: 11,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>
                    {p.productLine ?? "—"} ·{" "}
                    {p.engagementType
                      ? ENGAGEMENT_TYPE_LABELS[p.engagementType as keyof typeof ENGAGEMENT_TYPE_LABELS] ?? p.engagementType
                      : "—"}
                  </div>
                </div>
                {p.isSystem ? <Pill tone="brand">System</Pill> : <Pill>{p.scope === "company" ? "Company" : "User"}</Pill>}
                <select
                  value={p.status}
                  onChange={(e) => setStatus(p.id, e.target.value, p.name)}
                  style={{ ...inputStyle, width: "auto", padding: "6px 8px", fontSize: 12 }}
                >
                  {PRE_CALL_PLAN_TEMPLATE_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {PRE_CALL_PLAN_TEMPLATE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button type="button" style={{ ...btnGhost(), padding: "7px 12px" }} onClick={() => startEdit(p.id)}>
                  Edit
                </button>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 12.5, color: COLORS.muted }}>No playbooks yet.</span>
        )}
      </SubCard>
    </StepShell>
  );
}

/* ───────────────────────────── Territories step ───────────────────────────── */

const FACILITY_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "asc", label: "ASC" },
  { value: "clinic", label: "Clinic" },
  { value: "practice", label: "Practice" },
  { value: "distributor", label: "Distributor" },
  { value: "other", label: "Other" },
];

function TerritoriesStep({ snapshot, push, refreshSnapshot, onNext, onBack }: SharedProps) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [mapView, setMapView] = React.useState<"facilities" | "rep-coverage">("facilities");
  const [selectedRepId, setSelectedRepId] = React.useState<string | null>(null);
  const [coverageBusy, setCoverageBusy] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", surgical_crm_type: "hospital", surgical_crm_billing_state: "", surgical_crm_billing_city: "" });

  const salesReps = snapshot.users.salesReps;
  const selectedRep = selectedRepId ? salesReps.find((rep) => rep.id === selectedRepId) ?? null : null;

  React.useEffect(() => {
    if (selectedRepId && !salesReps.some((rep) => rep.id === selectedRepId)) {
      setSelectedRepId(null);
    }
  }, [salesReps, selectedRepId]);

  async function saveRepCoverage(userId: string, stateCodes: string[]) {
    setCoverageBusy(true);
    try {
      await apiJson("/api/admin/setup/rep-coverage", "POST", { userId, stateCodes });
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not update rep coverage");
    } finally {
      setCoverageBusy(false);
    }
  }

  async function toggleRepState(stateCode: string) {
    if (!selectedRep || coverageBusy) return;
    const next = selectedRep.coveredStates.includes(stateCode)
      ? selectedRep.coveredStates.filter((code) => code !== stateCode)
      : [...selectedRep.coveredStates, stateCode].sort();
    await saveRepCoverage(selectedRep.id, next);
  }

  async function save() {
    if (!form.name.trim()) {
      push("error", "Facility name is required");
      return;
    }
    setBusy(true);
    try {
      await apiJson("/api/admin/setup/facilities", "POST", {
        name: form.name,
        surgical_crm_type: form.surgical_crm_type,
        surgical_crm_billing_state: form.surgical_crm_billing_state || null,
        surgical_crm_billing_city: form.surgical_crm_billing_city || null,
      });
      push("success", `Added “${form.name}”`);
      setForm({ name: "", surgical_crm_type: "hospital", surgical_crm_billing_state: "", surgical_crm_billing_city: "" });
      setAdding(false);
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not add facility");
    } finally {
      setBusy(false);
    }
  }

  const ranked = [...snapshot.territories.items].sort((a, b) => b.facilityCount - a.facilityCount);
  const selectedTerritory = selected
    ? snapshot.territories.items.find((t) => t.territory === selected)
    : null;

  return (
    <StepShell id="territories" onNext={onNext} onBack={onBack}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatTile label="Facilities" value={String(snapshot.territories.totalFacilities)} tone="brand" />
        <StatTile label="States covered" value={String(Object.keys(snapshot.territories.stateCounts).length)} />
        <StatTile label="Sales reps" value={String(snapshot.users.salesRepCount)} />
        <StatTile
          label="Rep-assigned states"
          value={String(Object.keys(snapshot.territories.repCoverageByState).length)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(220px, 0.8fr)", gap: 16 }}>
        <SubCard
          title="Coverage map"
          action={
            <div style={{ display: "inline-flex", borderRadius: 999, border: `1px solid ${COLORS.lineSoft}`, overflow: "hidden" }}>
              {([
                ["facilities", "Facilities"],
                ["rep-coverage", "Rep coverage"],
              ] as const).map(([value, label]) => {
                const active = mapView === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setMapView(value);
                      if (value === "rep-coverage") setSelected(null);
                      else setSelectedRepId(null);
                    }}
                    style={{
                      border: "none",
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                      background: active ? "rgba(30,136,229,0.12)" : "white",
                      color: active ? "var(--brand-800)" : COLORS.muted,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          }
        >
          {mapView === "rep-coverage" ? (
            <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
              <Field label="Sales rep" hint="Select a rep, then click states on the map to assign coverage.">
                <select
                  style={inputStyle}
                  value={selectedRepId ?? ""}
                  onChange={(e) => setSelectedRepId(e.target.value || null)}
                  disabled={!salesReps.length || coverageBusy}
                >
                  <option value="">{salesReps.length ? "Choose a sales rep…" : "No sales reps yet — add them in Team & Access"}</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name || rep.email || "Sales rep"}
                      {rep.isTerritoryManager ? " · Territory manager" : ""}
                      {rep.coveredStates.length ? ` · ${rep.coveredStates.length} state${rep.coveredStates.length === 1 ? "" : "s"}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedRep ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {selectedRep.coveredStates.length ? (
                    selectedRep.coveredStates.map((code) => (
                      <button
                        key={code}
                        type="button"
                        disabled={coverageBusy}
                        onClick={() => void toggleRepState(code)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(30,136,229,0.28)",
                          background: "rgba(30,136,229,0.08)",
                          color: "var(--brand-800)",
                          fontSize: 12,
                          fontWeight: 850,
                          cursor: "pointer",
                        }}
                      >
                        {code} · {stateName(code)} ×
                      </button>
                    ))
                  ) : (
                    <span style={{ fontSize: 12.5, color: COLORS.muted }}>No states assigned yet — click the map to add coverage.</span>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <UsTerritoryMap
            counts={
              mapView === "facilities"
                ? snapshot.territories.stateCounts
                : snapshot.territories.repCoverageByState
            }
            selected={mapView === "facilities" ? selected : null}
            highlightedStates={mapView === "rep-coverage" && selectedRep ? selectedRep.coveredStates : undefined}
            onSelect={(code) => {
              if (!code) {
                if (mapView === "facilities") setSelected(null);
                return;
              }
              if (mapView === "rep-coverage") {
                if (!selectedRep) {
                  push("info", "Choose a sales rep first, then click states to assign coverage.");
                  return;
                }
                void toggleRepState(code);
                return;
              }
              setSelected(code);
            }}
            emptyHint={
              mapView === "facilities"
                ? "Hover a state to see facility counts"
                : selectedRep
                  ? "Click states to add or remove coverage for the selected rep"
                  : "Select a sales rep to edit state coverage"
            }
            formatDetail={(code, count) =>
              mapView === "facilities" ? (
                <span>
                  {stateName(code)} — <strong>{count}</strong> facilities
                </span>
              ) : (
                <span>
                  {stateName(code)} — <strong>{count}</strong> rep{count === 1 ? "" : "s"}
                  {selectedRep?.coveredStates.includes(code) ? " · covered by selected rep" : ""}
                </span>
              )
            }
          />
        </SubCard>

        <SubCard
          title="Territories"
          action={
            <button type="button" style={{ ...btnPrimary(), padding: "7px 12px", fontSize: 12 }} onClick={() => setAdding((v) => !v)}>
              + Facility
            </button>
          }
        >
          {adding ? (
            <div style={{ display: "grid", gap: 10, marginBottom: 14, padding: 12, background: COLORS.surface, borderRadius: 10 }}>
              <Field label="Facility name">
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Type">
                <select style={inputStyle} value={form.surgical_crm_type} onChange={(e) => setForm({ ...form, surgical_crm_type: e.target.value })}>
                  {FACILITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Field label="State">
                  <select style={inputStyle} value={form.surgical_crm_billing_state} onChange={(e) => setForm({ ...form, surgical_crm_billing_state: e.target.value })}>
                    <option value="">—</option>
                    {US_STATE_CODES.map((c) => (
                      <option key={c} value={c}>
                        {c} · {stateName(c)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="City">
                  <input style={inputStyle} value={form.surgical_crm_billing_city} onChange={(e) => setForm({ ...form, surgical_crm_billing_city: e.target.value })} />
                </Field>
              </div>
              <button type="button" style={btnPrimary(busy)} disabled={busy} onClick={save}>
                {busy ? "Adding…" : "Add facility"}
              </button>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 6, maxHeight: 320, overflowY: "auto" }}>
            {ranked.length ? (
              ranked.map((t) => {
                const isState = !!US_STATE_TILES[t.territory];
                const label = isState ? stateName(t.territory) : t.territory;
                const active = selected === t.territory;
                return (
                  <button
                    key={t.territory}
                    type="button"
                    onClick={() => setSelected(active ? null : t.territory)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 11px",
                      borderRadius: 9,
                      border: `1px solid ${active ? "rgba(30,136,229,0.4)" : COLORS.lineSoft}`,
                      background: active ? "rgba(30,136,229,0.06)" : "white",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 850, color: COLORS.ink }}>{label}</span>
                    <Pill tone="brand">{t.facilityCount}</Pill>
                  </button>
                );
              })
            ) : (
              <span style={{ fontSize: 12.5, color: COLORS.muted }}>No facilities yet.</span>
            )}
          </div>
        </SubCard>
      </div>

      {mapView === "facilities" && selectedTerritory ? (
        <SubCard title={`Facilities in ${US_STATE_TILES[selectedTerritory.territory] ? stateName(selectedTerritory.territory) : selectedTerritory.territory}`}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selectedTerritory.facilities.map((f) => (
              <Pill key={f.id}>
                {f.name}
                {f.type ? ` · ${f.type}` : ""}
              </Pill>
            ))}
            {selectedTerritory.facilityCount > selectedTerritory.facilities.length ? (
              <span style={{ fontSize: 12, color: COLORS.muted, alignSelf: "center", fontWeight: 700 }}>
                +{selectedTerritory.facilityCount - selectedTerritory.facilities.length} more
              </span>
            ) : null}
          </div>
        </SubCard>
      ) : null}

      {mapView === "rep-coverage" && salesReps.length ? (
        <SubCard title="Rep coverage roster">
          <div style={{ display: "grid", gap: 8 }}>
            {salesReps.map((rep) => (
              <button
                key={rep.id}
                type="button"
                onClick={() => setSelectedRepId(rep.id)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 12px",
                  borderRadius: 11,
                  border: `1px solid ${selectedRepId === rep.id ? "rgba(30,136,229,0.4)" : COLORS.lineSoft}`,
                  background: selectedRepId === rep.id ? "rgba(30,136,229,0.06)" : "white",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{rep.name || rep.email || "Sales rep"}</div>
                  <div style={{ fontSize: 12, color: COLORS.muted }}>
                    {rep.isTerritoryManager ? "Territory manager" : "Sales rep"}
                    {rep.email ? ` · ${rep.email}` : ""}
                  </div>
                </div>
                <Pill tone={rep.coveredStates.length ? "brand" : "neutral"}>
                  {rep.coveredStates.length ? `${rep.coveredStates.length} state${rep.coveredStates.length === 1 ? "" : "s"}` : "Unassigned"}
                </Pill>
              </button>
            ))}
          </div>
        </SubCard>
      ) : null}
    </StepShell>
  );
}

/* ───────────────────────────── Users step ───────────────────────────── */

const INVITE_ROLES = [
  { value: "INTERNAL_SALES_REP", label: "Sales rep" },
  { value: "INTERNAL_ADMIN", label: "Admin" },
];

function UsersStep({ snapshot, push, refreshSnapshot, onNext, onBack }: SharedProps) {
  const [busyUser, setBusyUser] = React.useState<string | null>(null);
  const [rosterBusy, setRosterBusy] = React.useState<string | null>(null);
  const [invite, setInvite] = React.useState({ email: "", fullName: "", role: "INTERNAL_SALES_REP" });
  const [inviting, setInviting] = React.useState(false);

  async function setRole(
    userId: string,
    roles: { is_admin: boolean; is_internal_sales_rep: boolean; is_territory_manager: boolean },
  ) {
    setBusyUser(userId);
    try {
      await apiJson("/api/admin/setup/roles", "POST", { userId, ...roles });
      push("success", "Roles updated");
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not update roles");
    } finally {
      setBusyUser(null);
    }
  }

  async function sendInvite() {
    if (!invite.email.trim() || !invite.fullName.trim()) {
      push("error", "Name and email are required");
      return;
    }
    setInviting(true);
    try {
      const res = await apiJson<{ existed: boolean; emailSent: boolean; emailReason: string | null }>(
        "/api/admin/setup/invite-teammate",
        "POST",
        { email: invite.email.trim(), fullName: invite.fullName.trim(), role: invite.role },
      );
      if (res.emailSent) {
        push("success", `${res.existed ? "Access granted — " : ""}Portal invite email sent to ${invite.email.trim()}`);
      } else {
        push("info", `Role granted, but email could not be sent: ${res.emailReason ?? "unknown"}`);
      }
      setInvite({ ...invite, email: "", fullName: "" });
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function assignRepManager(repUserId: string, managerUserId: string | null) {
    setRosterBusy(repUserId);
    try {
      await apiJson("/api/admin/setup/rep-manager", "POST", { repUserId, managerUserId });
      push("success", managerUserId ? "Rep assigned to territory manager" : "Rep removed from roster");
      await refreshSnapshot();
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not update rep roster");
    } finally {
      setRosterBusy(null);
    }
  }

  return (
    <StepShell id="users" onNext={onNext} onBack={onBack}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatTile label="Admins" value={String(snapshot.users.adminCount)} />
        <StatTile label="Sales reps" value={String(snapshot.users.salesRepCount)} tone="brand" />
        <StatTile label="Territory managers" value={String(snapshot.users.territoryManagerCount)} />
      </div>

      <SubCard title="Invite a Sales Command teammate">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
          <Field label="Full name">
            <input style={inputStyle} value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
          </Field>
          <Field label="Email">
            <input style={inputStyle} type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          </Field>
          <Field label="Sales Command role">
            <select style={inputStyle} value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
              {INVITE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: COLORS.muted }}>
            Provisions Sales Command access, adds them to 360 Medical Internal Team, and emails a secure “set your
            password” link.
          </span>
          <button type="button" style={btnPrimary(inviting)} disabled={inviting} onClick={sendInvite}>
            {inviting ? "Sending…" : "Send invite"}
          </button>
        </div>
      </SubCard>

      <SubCard title="Team directory">
        <TeamDirectoryPanel
          team={snapshot.users.team}
          busyUser={busyUser}
          rosterBusy={rosterBusy}
          onSetRole={(userId, roles) => void setRole(userId, roles)}
          onAssignRepManager={(repUserId, managerUserId) => void assignRepManager(repUserId, managerUserId)}
        />
      </SubCard>
    </StepShell>
  );
}

/* ───────────────────────────── Leaderboard scoring step ───────────────────────────── */

type LeaderMetric = {
  key: string;
  label: string;
  description: string;
  category: string;
  captureStatus: string;
  defaultPoints: number;
  dataSource: string;
  enabled: boolean;
  points: number;
};

function IntelligenceStep({ snapshot, push, onNext, onBack }: SharedProps) {
  const [metrics, setMetrics] = React.useState<LeaderMetric[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);

  const loadConfig = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ activeMetrics: LeaderMetric[]; availableMetrics: LeaderMetric[] }>(
        "/api/admin/sales/leaderboard/config",
        "GET",
      );
      setMetrics([...data.activeMetrics, ...data.availableMetrics]);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Could not load scoring config");
    } finally {
      setLoading(false);
    }
  }, [push]);

  React.useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  function update(key: string, patch: Partial<LeaderMetric>) {
    setMetrics((prev) => (prev ? prev.map((m) => (m.key === key ? { ...m, ...patch } : m)) : prev));
    setDirty(true);
  }

  async function saveScoring() {
    if (!metrics) return;
    const enabled = metrics.filter((m) => m.enabled);
    if (!enabled.length) {
      push("error", "Enable at least one scoring metric");
      return;
    }
    setSaving(true);
    try {
      const metricPoints: Record<string, number> = {};
      for (const m of metrics) metricPoints[m.key] = m.points;
      await apiJson("/api/admin/sales/leaderboard/config", "PUT", {
        enabledMetrics: enabled.map((m) => m.key),
        metricPoints,
      });
      push("success", "Scoring configuration saved");
      setDirty(false);
    } catch (e) {
      push("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StepShell id="intelligence" onNext={onNext} onBack={onBack}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <StatTile
          label="Scored metrics"
          value={String(snapshot.intelligence.leaderboardEnabledMetricCount)}
          tone="brand"
        />
        <StatTile
          label="Last updated"
          value={
            snapshot.intelligence.leaderboardUpdatedAt
              ? new Date(snapshot.intelligence.leaderboardUpdatedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not saved yet"
          }
        />
      </div>

      <SubCard
        title="Rep leaderboard scoring"
        action={
          <button type="button" style={btnPrimary(saving || !dirty)} disabled={saving || !dirty} onClick={saveScoring}>
            {saving ? "Saving…" : "Save scoring"}
          </button>
        }
      >
        <p style={{ margin: "0 0 14px", fontSize: 13, color: COLORS.muted, lineHeight: 1.55, maxWidth: 720 }}>
          Choose which rep activities earn leaderboard points and how much each one is worth. Disabled metrics stay off the
          leaderboard until you turn them on.
        </p>
        {loading ? (
          <div style={{ fontSize: 13, color: COLORS.muted }}>Loading scoring config…</div>
        ) : metrics ? (
          <div style={{ display: "grid", gap: 8 }}>
            {metrics.map((m) => (
              <div
                key={m.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  border: `1px solid ${COLORS.lineSoft}`,
                  borderRadius: 11,
                  flexWrap: "wrap",
                  opacity: m.enabled ? 1 : 0.65,
                }}
              >
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 900, fontSize: 13.5 }}>{m.label}</div>
                  <div style={{ fontSize: 11.5, color: COLORS.muted }}>{m.description}</div>
                </div>
                <Pill tone={m.captureStatus === "wired" ? "ready" : "warn"}>
                  {m.captureStatus === "wired" ? "Scoring live" : "Catalog only"}
                </Pill>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800 }}>
                  <span style={{ color: COLORS.muted }}>pts</span>
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={m.points}
                    onChange={(e) => update(m.key, { points: Math.max(0, Number(e.target.value) || 0) })}
                    style={{ ...inputStyle, width: 78, padding: "7px 9px" }}
                  />
                </label>
                <Toggle on={m.enabled} onChange={(v) => update(m.key, { enabled: v })} />
              </div>
            ))}
          </div>
        ) : null}
      </SubCard>
    </StepShell>
  );
}

/* ───────────────────────────── Review step ───────────────────────────── */

function ReviewStep({
  snapshot,
  company,
  goTo,
  onBack,
  markReviewed,
}: SharedProps & { company: CompanyProfile; markReviewed: (s: AdminSetupStepId) => void }) {
  const rows: { step: AdminSetupStepId; label: string; value: string }[] = [
    { step: "company", label: "Company", value: `${company.companyName} · ${company.specialtyFocus.length} specialties` },
    {
      step: "products",
      label: "Products",
      value: `${snapshot.products.length} families · ${snapshot.products.filter((p) => p.active).length} active`,
    },
    {
      step: "playbooks",
      label: "Playbooks",
      value: `${snapshot.playbooks.activeCount} active · ${snapshot.playbooks.total} total`,
    },
    {
      step: "documents",
      label: "Documents",
      value: `${snapshot.documents.folderCount} folders · ${snapshot.documents.fileCount} files · ${snapshot.documents.repVisibleFolderCount} visible to reps`,
    },
    {
      step: "territories",
      label: "Territories",
      value: `${snapshot.territories.totalFacilities} facilities · ${Object.keys(snapshot.territories.stateCounts).length} facility states · ${snapshot.users.salesReps.filter((rep) => rep.coveredStates.length).length} reps with coverage`,
    },
    {
      step: "users",
      label: "Team",
      value: `${snapshot.users.adminCount} admins · ${snapshot.users.salesRepCount} reps · ${snapshot.users.territoryManagerCount} territory managers`,
    },
    {
      step: "intelligence",
      label: "Leaderboard",
      value: `${snapshot.intelligence.leaderboardEnabledMetricCount} scored metric${snapshot.intelligence.leaderboardEnabledMetricCount === 1 ? "" : "s"}`,
    },
  ];

  return (
    <StepShell id="review" onNext={() => markReviewed("review")} onBack={onBack} nextLabel="Mark setup reviewed ✓">
      <div
        style={{
          borderRadius: 14,
          padding: 16,
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.2)",
          color: "#166534",
          fontWeight: 800,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        Your portal is live and fully usable. This configuration reflects the current build — keep refining any section as
        your team grows.
      </div>

      <div style={{ display: "grid", gap: 4 }}>
        {rows.map((r) => (
          <div
            key={r.step}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              padding: "13px 4px",
              borderBottom: `1px solid ${COLORS.lineSoft}`,
            }}
          >
            <div>
              <div style={{ fontWeight: 950, fontSize: 14 }}>{r.label}</div>
              <div style={{ fontSize: 12.5, color: COLORS.muted, marginTop: 3 }}>{r.value}</div>
            </div>
            <button type="button" style={{ ...btnGhost(), padding: "7px 14px" }} onClick={() => goTo(r.step)}>
              Edit
            </button>
          </div>
        ))}
      </div>
    </StepShell>
  );
}
