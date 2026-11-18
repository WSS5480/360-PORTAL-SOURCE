"use client";

import Link from "next/link";
import React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  filterObservationFormLibraryItems,
  type ObservationFormLibraryGroup,
  type ObservationFormLibraryItem,
} from "@/lib/surgical-sales/observationFormLibrary";

type LibraryJson = {
  ok?: boolean;
  error?: string;
  can_view_team?: boolean;
  total?: number;
  groups?: ObservationFormLibraryGroup[];
};

function formatDate(ymd: string | null): string | null {
  if (!ymd) return null;
  const date = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(date.getTime())) return ymd;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function FormRow({ item, showRep }: { item: ObservationFormLibraryItem; showRep: boolean }) {
  const meta = [
    showRep ? item.uploaderName : null,
    item.providerName,
    item.facilityName,
    formatDate(item.caseDate),
    item.caseNumber,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      style={{
        borderBottom: "1px solid color-mix(in srgb, var(--foreground) 6%, var(--border))",
        background: "#fff",
        padding: "12px 14px",
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 850, fontSize: 14, letterSpacing: "-0.02em" }}>{item.fileName}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>{meta}</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a
          href={`/api/portal/sales/observation-forms/${encodeURIComponent(item.id)}/download`}
          style={{ ...sc.btnSecondary, textDecoration: "none", fontSize: 12, padding: "8px 12px" }}
        >
          Download
        </a>
        <Link href={item.caseHref} style={{ ...sc.btnGhost, textDecoration: "none", fontSize: 12, padding: "8px 12px" }}>
          Open case
        </Link>
      </div>
    </li>
  );
}

export default function PortalObservationFormsClient() {
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [canViewTeam, setCanViewTeam] = React.useState(false);
  const [groups, setGroups] = React.useState<ObservationFormLibraryGroup[]>([]);
  const [query, setQuery] = React.useState("");
  const [openGroups, setOpenGroups] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/sales/observation-forms", { cache: "no-store" });
        const j = (await res.json()) as LibraryJson;
        if (!j.ok) throw new Error(j.error || "");
        if (cancelled) return;
        const nextGroups = j.groups || [];
        setCanViewTeam(j.can_view_team === true);
        setGroups(nextGroups);
        setOpenGroups(new Set(nextGroups.map((group) => group.id)));
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load observation forms. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleGroups = React.useMemo(() => {
    const q = query.trim();
    if (!q) return groups;
    return groups
      .map((group) => ({ ...group, forms: filterObservationFormLibraryItems(group.forms, q) }))
      .filter((group) => group.forms.length > 0);
  }, [groups, query]);

  const visibleCount = visibleGroups.reduce((n, group) => n + group.forms.length, 0);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <SalesCommandPage
      title="Observation forms"
      subtitle={
        canViewTeam
          ? "Completed case observation forms for your team, grouped by rep."
          : "Completed case observation forms you have uploaded."
      }
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <div className="sc-native-page surgical-cases-mobile-root">
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow
              title="Observation forms"
              countLabel={busy ? "Loading…" : `${visibleCount} form${visibleCount === 1 ? "" : "s"}`}
            />
          </header>
        </div>
        <div className="sc-mobile-list-body">
          <div style={{ padding: "10px 12px 6px" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={canViewTeam ? "Search by rep, provider, facility, or file" : "Search by provider, facility, or file"}
              style={sc.input}
              aria-label="Search observation forms"
            />
          </div>
          {err ? <div style={{ ...sc.alertError, margin: "8px 12px" }}>{err}</div> : null}
          {busy ? <div style={{ padding: "12px", color: "var(--muted)", fontSize: 13 }}>Loading forms…</div> : null}
          {!busy && visibleGroups.length === 0 ? (
            <div style={{ padding: "16px 12px", color: "var(--muted)", fontSize: 13 }}>
              {query.trim() ? "No forms match that search." : "No observation forms uploaded yet."}
            </div>
          ) : null}
          {!busy
            ? visibleGroups.map((group) => {
                const open = openGroups.has(group.id);
                return (
                  <section key={group.id} style={{ marginBottom: 10 }}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      style={{
                        width: "100%",
                        border: "none",
                        background: "color-mix(in srgb, var(--brand-050) 55%, white)",
                        padding: "12px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        cursor: "pointer",
                        textAlign: "left",
                        borderTop: "1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border))",
                        borderBottom: "1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border))",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 950, color: "var(--brand-700)" }}>{open ? "▾" : "▸"}</span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 950, fontSize: 15, letterSpacing: "-0.02em" }}>
                          {group.title}
                        </span>
                        {group.subtitle ? (
                          <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                            {group.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </button>
                    {open ? (
                      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                        {group.forms.map((item) => (
                          <FormRow key={item.id} item={item} showRep={canViewTeam} />
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })
            : null}
        </div>
      </div>
    </SalesCommandPage>
  );
}
