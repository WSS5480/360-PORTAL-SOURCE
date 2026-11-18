"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { PortalEmptyState } from "@/components/sales/PortalEmptyState";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import { userFacingError } from "@/lib/errors/userFacingError";
import {
  filterTeamActivityFeed,
  groupTeamActivityByDay,
  parseTeamActivityKindFilter,
  parseTeamActivityWhenFilter,
  teamActivityOrganizationOptions,
  type TeamActivityFeedItem,
  type TeamActivityFeedKind,
  type TeamActivityRepOption,
  type TeamActivityWhenFilter,
} from "@/lib/surgical-sales/buildTeamActivityFeed";

type ActivityJson = {
  ok?: boolean;
  viewer_user_id?: string;
  reps?: TeamActivityRepOption[];
  items?: TeamActivityFeedItem[];
  error?: string;
};

type KindFilter = "" | TeamActivityFeedKind;

const KIND_FILTERS: Array<{ id: KindFilter; label: string }> = [
  { id: "", label: "All types" },
  { id: "note", label: "Notes" },
  { id: "case", label: "Cases" },
  { id: "document", label: "Documents" },
  { id: "billing", label: "Billing" },
  { id: "other", label: "Other" },
];

const WHEN_FILTERS: Array<{ id: TeamActivityWhenFilter; label: string }> = [
  { id: "", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "Last 7 days" },
];

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        ...(active ? sc.btnPrimary : sc.btnSecondary),
        fontSize: 12,
        padding: "8px 12px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {count != null ? <span style={{ opacity: 0.85, fontWeight: 700, marginLeft: 6 }}>({count})</span> : null}
    </button>
  );
}

function FilterChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="team-activity-filter-scroll">
      <div className="team-activity-filter-row">{children}</div>
    </div>
  );
}

const activityRecordLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  color: "var(--brand-600)",
  textDecoration: "none",
};

function kindIcon(item: TeamActivityFeedItem): string {
  const t = String(item.activity_type || "").toLowerCase();
  if (t === "note") return "📝";
  if (t === "case_created") return "📁";
  if (t === "case_updated") return "⌁";
  if (t === "status_change") return "↻";
  if (t === "document_uploaded") return "📄";
  if (t === "document_deleted") return "🗑️";
  if (t === "billing_update") return "💳";
  if (t === "product_updated") return "◫";
  return "●";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
}

function TeamActivityRow({ item, isLast }: { item: TeamActivityFeedItem; isLast: boolean }) {
  const body = item.body?.trim() || "";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 12, alignItems: "stretch", width: "100%" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: 0, flexShrink: 0 }}>
        <div
          aria-hidden
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            background: "linear-gradient(145deg, color-mix(in srgb, var(--brand-600) 12%, var(--surface)), var(--surface))",
            border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 10%, var(--border)))",
          }}
        >
          {kindIcon(item)}
        </div>
        {!isLast ? (
          <div
            aria-hidden
            style={{
              width: 2,
              flex: 1,
              minHeight: 12,
              marginTop: 6,
              borderRadius: 2,
              background:
                "linear-gradient(180deg, color-mix(in srgb, var(--brand-600) 35%, var(--border)), color-mix(in srgb, var(--crm-cyan-bright, #22d3ee) 20%, var(--border)))",
            }}
          />
        ) : null}
      </div>
      <div
        style={{
          minWidth: 0,
          borderRadius: 14,
          border: "1px solid var(--crm-card-edge, color-mix(in srgb, var(--foreground) 9%, var(--border)))",
          background: "var(--crm-surface-elevated, var(--surface))",
          padding: "12px 14px",
          marginBottom: isLast ? 0 : 4,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em", lineHeight: 1.35 }}>{item.summary}</div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 700 }}>
          {item.organization_id ? (
            <Link href={`/portal/sales/accounts/${item.organization_id}`} style={activityRecordLink}>
              {item.organization_name || "Organization"}
            </Link>
          ) : item.organization_name ? (
            <span>{item.organization_name}</span>
          ) : null}
          {item.case_id ? (
            <Link href={`/portal/sales/cases/${item.case_id}`} style={activityRecordLink}>
              {item.case_number ? `Case ${item.case_number}` : "Open case"}
            </Link>
          ) : null}
        </div>
        {body ? (
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{body}</div>
        ) : null}
        <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)", fontWeight: 700, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span>{item.actor_display_name === "—" ? "Actor not recorded" : item.actor_display_name}</span>
          <span>·</span>
          <span>{formatWhen(item.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

export default function SalesTeamActivityClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [viewerId, setViewerId] = React.useState("");
  const [reps, setReps] = React.useState<TeamActivityRepOption[]>([]);
  const [items, setItems] = React.useState<TeamActivityFeedItem[]>([]);
  const [query, setQuery] = React.useState(searchParams.get("q") || "");
  const [kindFilter, setKindFilter] = React.useState<KindFilter>(parseTeamActivityKindFilter(searchParams.get("type")));
  const [whenFilter, setWhenFilter] = React.useState<TeamActivityWhenFilter>(parseTeamActivityWhenFilter(searchParams.get("when")));
  const [repFilter, setRepFilter] = React.useState(searchParams.get("rep") || "");
  const [orgFilter, setOrgFilter] = React.useState(searchParams.get("org") || "");

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/sales/team-activity", { cache: "no-store" });
        const json = (await res.json()) as ActivityJson;
        if (!res.ok || !json.ok) throw new Error(json.error || "Could not load activity");
        if (cancelled) return;
        setViewerId(String(json.viewer_user_id || ""));
        setReps(Array.isArray(json.reps) ? json.reps : []);
        setItems(Array.isArray(json.items) ? json.items : []);
      } catch (e: unknown) {
        if (!cancelled) setErr(userFacingError(e, "Could not load team activity."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function writeFilters(next: {
    query: string;
    kind: KindFilter;
    when: TeamActivityWhenFilter;
    rep: string;
    org: string;
  }) {
    const params = new URLSearchParams();
    if (next.query.trim()) params.set("q", next.query.trim());
    if (next.kind) params.set("type", next.kind);
    if (next.when) params.set("when", next.when);
    if (next.rep) params.set("rep", next.rep);
    if (next.org) params.set("org", next.org);
    const qs = params.toString();
    router.replace(`/portal/sales/activity${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function setQueryAndUrl(value: string) {
    setQuery(value);
    writeFilters({ query: value, kind: kindFilter, when: whenFilter, rep: repFilter, org: orgFilter });
  }
  function setKindAndUrl(value: KindFilter) {
    setKindFilter(value);
    writeFilters({ query, kind: value, when: whenFilter, rep: repFilter, org: orgFilter });
  }
  function setWhenAndUrl(value: TeamActivityWhenFilter) {
    setWhenFilter(value);
    writeFilters({ query, kind: kindFilter, when: value, rep: repFilter, org: orgFilter });
  }
  function setRepAndUrl(value: string) {
    setRepFilter(value);
    writeFilters({ query, kind: kindFilter, when: whenFilter, rep: value, org: orgFilter });
  }
  function setOrgAndUrl(value: string) {
    setOrgFilter(value);
    writeFilters({ query, kind: kindFilter, when: whenFilter, rep: repFilter, org: value });
  }
  function clearFilters() {
    setQuery("");
    setKindFilter("");
    setWhenFilter("");
    setRepFilter("");
    setOrgFilter("");
    writeFilters({ query: "", kind: "", when: "", rep: "", org: "" });
  }

  const filters = React.useMemo(
    () => ({ kind: kindFilter, actorUserId: repFilter, organizationId: orgFilter, when: whenFilter, query }),
    [kindFilter, repFilter, orgFilter, whenFilter, query],
  );
  const filtered = React.useMemo(() => filterTeamActivityFeed(items, filters), [items, filters]);
  const itemsForKindCounts = React.useMemo(
    () => filterTeamActivityFeed(items, { ...filters, kind: "" }),
    [items, filters],
  );
  const groups = React.useMemo(() => groupTeamActivityByDay(filtered), [filtered]);
  const organizations = React.useMemo(() => teamActivityOrganizationOptions(items), [items]);
  const filtersActive = Boolean(query.trim() || kindFilter || whenFilter || repFilter || orgFilter);

  return (
    <SalesCommandPage
      title="Activity"
      subtitle="What every rep has been doing. Mix the filters however you want — person, type, day, organization, or search."
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
.team-activity-filter-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.team-activity-filter-scroll::-webkit-scrollbar { display: none; }
.team-activity-filter-row { display: flex; flex-wrap: nowrap; gap: 8px; padding-bottom: 2px; }
@media (min-width: 720px) {
  .team-activity-filter-row { flex-wrap: wrap; }
}
.team-activity-filters { display: grid; gap: 14px; }
.team-activity-filter-label { font-size: 12px; font-weight: 800; color: var(--muted); }
.team-activity-selects { display: grid; gap: 10px; }
@media (min-width: 720px) {
  .team-activity-selects { grid-template-columns: 1fr 1fr; }
}
`,
        }}
      />
      {err ? (
        <div role="alert" style={sc.alertError}>
          {err}
        </div>
      ) : null}
      {busy ? (
        <p style={{ margin: 0, color: "var(--muted)", fontWeight: 700 }}>Loading activity…</p>
      ) : items.length === 0 ? (
        <PortalEmptyState
          icon="✨"
          title="No team activity yet"
          description="When reps add notes, update cases, or upload documents, it will show up here for the whole team."
        />
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="team-activity-filters">
            <label style={{ display: "grid", gap: 6 }}>
              <span className="team-activity-filter-label">Search</span>
              <input
                value={query}
                onChange={(e) => setQueryAndUrl(e.target.value)}
                style={sc.input}
                placeholder="Search notes, orgs, cases, or names"
                aria-label="Search team activity"
              />
            </label>

            <div style={{ display: "grid", gap: 6 }}>
              <div className="team-activity-filter-label">When</div>
              <FilterChipRow>
                {WHEN_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter.id || "any-time"}
                    active={whenFilter === filter.id}
                    label={filter.label}
                    onClick={() => setWhenAndUrl(filter.id)}
                  />
                ))}
              </FilterChipRow>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div className="team-activity-filter-label">Type</div>
              <FilterChipRow>
                {KIND_FILTERS.map((filter) => {
                  const count = filter.id
                    ? itemsForKindCounts.filter((item) => item.feed_kind === filter.id).length
                    : itemsForKindCounts.length;
                  return (
                    <FilterChip
                      key={filter.id || "all-types"}
                      active={kindFilter === filter.id}
                      label={filter.label}
                      count={count}
                      onClick={() => setKindAndUrl(filter.id)}
                    />
                  );
                })}
              </FilterChipRow>
            </div>

            <div className="team-activity-selects">
              <label style={{ display: "grid", gap: 6 }}>
                <span className="team-activity-filter-label">Person</span>
                <select
                  value={repFilter}
                  onChange={(e) => setRepAndUrl(e.target.value)}
                  style={sc.input}
                  aria-label="Filter activity by person"
                >
                  <option value="">All reps</option>
                  {viewerId ? <option value={viewerId}>Me</option> : null}
                  {reps
                    .filter((rep) => rep.user_id !== viewerId)
                    .map((rep) => (
                      <option key={rep.user_id} value={rep.user_id}>
                        {rep.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span className="team-activity-filter-label">Organization</span>
                <select
                  value={orgFilter}
                  onChange={(e) => setOrgAndUrl(e.target.value)}
                  style={sc.input}
                  aria-label="Filter activity by organization"
                >
                  <option value="">All organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>
            <span>
              Showing {filtered.length} of {items.length}
            </span>
            {filtersActive ? (
              <button type="button" style={{ ...sc.btnSecondary, fontSize: 12, padding: "6px 10px", minHeight: 36 }} onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>

          {filtered.length === 0 ? (
            <PortalEmptyState
              compact
              icon="🏷️"
              title="Nothing in this view"
              description="Try another combination, or clear the filters to see the full team timeline."
              footer={
                <button type="button" style={{ ...sc.btnSecondary, fontSize: 13, padding: "10px 16px" }} onClick={clearFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            groups.map((group) => (
              <section key={group.key} aria-label={group.label} style={{ display: "grid", gap: 8 }}>
                <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--muted)" }}>
                  {group.label}
                </h2>
                <div style={{ display: "grid", gap: 4 }}>
                  {group.items.map((item, idx) => (
                    <TeamActivityRow key={item.id} item={item} isLast={idx === group.items.length - 1} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}
    </SalesCommandPage>
  );
}
