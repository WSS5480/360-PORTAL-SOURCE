"use client";

import Link from "next/link";
import React from "react";
import type { GlobalSearchGroups, GlobalSearchHit } from "@/lib/search/globalSearchServer";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 220;

function mergeContactHits(groups: GlobalSearchGroups): GlobalSearchHit[] {
  const seen = new Set<string>();
  const out: GlobalSearchHit[] = [];
  for (const list of [groups.doctors, groups.supporting_contacts, groups.contacts]) {
    for (const h of list) {
      if (seen.has(h.id)) continue;
      seen.add(h.id);
      out.push(h);
    }
  }
  return out.slice(0, 20);
}

function metaParts(hit: GlobalSearchHit): string[] {
  const parts = [hit.roleLabel, hit.organizationName, hit.relationshipLabel].filter(
    (p): p is string => Boolean(p && String(p).trim())
  );
  return parts;
}

export function CrmGlobalSearchBar() {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [q, setQ] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [groups, setGroups] = React.useState<GlobalSearchGroups | null>(null);
  const reqSeq = React.useRef(0);

  React.useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  React.useEffect(() => {
    if (debounced.length < MIN_QUERY) {
      setGroups(null);
      setLoading(false);
      return;
    }
    const seq = ++reqSeq.current;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/portal/sales/global-search?q=${encodeURIComponent(debounced)}`,
          { cache: "no-store" }
        );
        const j = (await res.json()) as { ok?: boolean; groups?: GlobalSearchGroups };
        if (seq !== reqSeq.current) return;
        if (!res.ok || !j.ok || !j.groups) {
          setGroups(null);
          return;
        }
        setGroups(j.groups);
      } catch {
        if (seq === reqSeq.current) setGroups(null);
      } finally {
        if (seq === reqSeq.current) setLoading(false);
      }
    })();
  }, [debounced]);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const contacts = groups ? mergeContactHits(groups) : [];
  const cases = groups?.cases ?? [];
  const orgs = groups?.organizations ?? [];
  const hasResults = contacts.length > 0 || cases.length > 0 || orgs.length > 0;
  const showPanel = open && debounced.length >= MIN_QUERY;

  return (
    <div ref={wrapRef} className="crm-global-search-wrap">
      <div className="crm-global-search-inner">
        <label className="crm-global-search-label" htmlFor="crm-global-search-input">
          Search CRM
        </label>
        <input
          id="crm-global-search-input"
          ref={inputRef}
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Contacts, cases, organizations…"
          className="crm-global-search-input"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
        />
        {showPanel ? (
          <div className="crm-global-search-panel" role="region" aria-label="Search results">
            {loading ? (
              <div className="crm-global-search-muted">Searching…</div>
            ) : !hasResults ? (
              <div className="crm-global-search-muted">No matches for “{debounced}”.</div>
            ) : (
              <>
                {contacts.length > 0 ? (
                  <SearchSection title="Contacts" hits={contacts} onPick={() => setOpen(false)} />
                ) : null}
                {cases.length > 0 ? (
                  <SearchSection title="Cases" hits={cases} onPick={() => setOpen(false)} />
                ) : null}
                {orgs.length > 0 ? (
                  <SearchSection title="Organizations" hits={orgs} onPick={() => setOpen(false)} />
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SearchSection({
  title,
  hits,
  onPick,
}: {
  title: string;
  hits: GlobalSearchHit[];
  onPick: () => void;
}) {
  return (
    <div className="crm-global-search-section">
      <div className="crm-global-search-section-title">{title}</div>
      <ul className="crm-global-search-list">
        {hits.map((hit) => (
          <li key={`${title}-${hit.id}`} className="crm-global-search-li">
            <div className="crm-global-search-row">
              <Link href={hit.href} className="crm-global-search-row-main" onClick={onPick}>
                <span className="crm-global-search-title">{hit.title}</span>
                {metaParts(hit).length > 0 ? (
                  <span className="crm-global-search-meta">{metaParts(hit).join(" · ")}</span>
                ) : (
                  <span className="crm-global-search-meta">{hit.subtitle}</span>
                )}
              </Link>
              {hit.actions && hit.actions.length > 0 ? (
                <div className="crm-global-search-actions">
                  {hit.actions.map((a) => (
                    <Link
                      key={`${hit.id}-${a.label}`}
                      href={a.href}
                      className="crm-global-search-action"
                      onClick={onPick}
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
