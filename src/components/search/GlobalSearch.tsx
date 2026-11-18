"use client";

import { useRouter } from "next/navigation";
import React from "react";
import type { GlobalSearchGroups } from "@/lib/search/globalSearchServer";

const DEBOUNCE_MS = 200;
const MIN_CHARS = 2;

type ApiResponse = { ok: boolean; groups?: GlobalSearchGroups; error?: string };

function useDebouncedValue<T>(value: T, delay: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = window.setTimeout(() => setV(value), delay);
    return () => window.clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function GlobalSearch({
  apiPath,
  label = "Search",
  wide,
}: {
  /** e.g. `/api/admin/global-search` or `/api/portal/sales/global-search` */
  apiPath: string;
  label?: string;
  /** Wider input (admin header) */
  wide?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const dq = useDebouncedValue(q, DEBOUNCE_MS);
  const [data, setData] = React.useState<GlobalSearchGroups | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [active, setActive] = React.useState(0);
  const itemRefs = React.useRef<Array<HTMLElement | null>>([]);

  const flatItems = React.useMemo(() => {
    if (!data) return [];
    const isPortalSalesCrm = apiPath.includes("/api/portal/sales/global-search");
    const order: (keyof GlobalSearchGroups)[] = isPortalSalesCrm
      ? ["organizations", "doctors", "supporting_contacts", "cases", "contacts", "products", "skus"]
      : ["organizations", "doctors", "supporting_contacts", "accounts", "cases", "contacts", "products", "skus"];
    const labels: Record<keyof GlobalSearchGroups, string> = {
      organizations: "Organizations",
      doctors: "Providers",
      supporting_contacts: "Supporting Contacts",
      accounts: "Accounts",
      cases: "Cases",
      contacts: "Contacts",
      products: "Products",
      skus: "SKUs",
    };
    const out: Array<{
      group: string;
      groupKey: keyof GlobalSearchGroups;
      href: string;
      title: string;
      subtitle: string;
      actions?: Array<{ label: string; href: string }>;
    }> = [];
    for (const key of order) {
      const rows = data[key] || [];
      for (const r of rows) {
        out.push({ group: labels[key], groupKey: key, href: r.href, title: r.title, subtitle: r.subtitle, actions: r.actions });
      }
    }
    return out;
  }, [apiPath, data]);

  React.useEffect(() => {
    if (dq.trim().length < MIN_CHARS) {
      setData(null);
      setErr(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const res = await fetch(`${apiPath}?q=${encodeURIComponent(dq.trim())}`, { cache: "no-store" });
        const j = (await res.json()) as ApiResponse;
        if (cancelled) return;
        if (!res.ok || !j.ok) {
          setErr(typeof j.error === "string" ? j.error : "Search failed");
          setData(null);
          return;
        }
        setData(j.groups ?? null);
      } catch {
        if (!cancelled) {
          setErr("Search failed");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiPath, dq]);

  React.useEffect(() => {
    setActive(0);
  }, [flatItems.length, dq]);

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigateActive = () => {
    const item = flatItems[active];
    if (item) {
      setOpen(false);
      router.push(item.href);
    }
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(0, flatItems.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter" && flatItems.length > 0) {
      e.preventDefault();
      navigateActive();
    }
  };

  React.useEffect(() => {
    itemRefs.current = [];
  }, [flatItems]);

  React.useEffect(() => {
    const el = itemRefs.current[active];
    el?.scrollIntoView({ block: "nearest" });
  }, [active, flatItems.length]);

  const showPanel = open && (dq.trim().length >= MIN_CHARS || loading);

  return (
    <div
      ref={rootRef}
      style={{ position: "relative", flex: wide ? "1 1 280px" : "0 1 auto", minWidth: 0, maxWidth: wide ? "min(100%, 420px)" : 260 }}
    >
      <label style={{ display: "block", margin: 0 }}>
        <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>{label}</span>
        <input
          ref={inputRef}
          type="search"
          autoComplete="off"
          placeholder={`${label} (⌘K)`}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "8px 12px",
            borderRadius: 12,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "color-mix(in srgb, var(--brand-600) 18%, var(--border))",
            fontSize: 13,
            fontWeight: 650,
            background: "var(--surface)",
            color: "var(--foreground)",
          }}
        />
      </label>

      {showPanel ? (
        <div
          role="listbox"
          aria-label="Search results"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 100,
            maxHeight: "min(70vh, 420px)",
            overflowY: "auto",
            borderRadius: 14,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "0 18px 50px rgba(15,23,42,0.18)",
            padding: "8px 0",
          }}
        >
          {loading ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)", fontWeight: 650 }}>Searching…</div>
          ) : err ? (
            <div role="alert" style={{ padding: "12px 14px", fontSize: 13, color: "var(--danger)", fontWeight: 650 }}>
              {err}
            </div>
          ) : flatItems.length === 0 ? (
            <div style={{ padding: "12px 14px", fontSize: 13, color: "var(--muted)", fontWeight: 650 }}>No matches.</div>
          ) : (
            flatItems.map((item, i) => (
              <React.Fragment key={`${item.groupKey}-${item.href}-${i}`}>
                {(i === 0 || flatItems[i - 1]!.groupKey !== item.groupKey) ? (
                  <div
                    style={{
                      padding: "8px 14px 4px",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    {item.group}
                  </div>
                ) : null}
                <div
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role="option"
                  aria-selected={active === i}
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    display: "block",
                    padding: "10px 14px",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    background: active === i ? "color-mix(in srgb, var(--brand-600) 10%, var(--surface))" : "transparent",
                    borderLeft: active === i ? "3px solid var(--brand-600)" : "3px solid transparent",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>{item.subtitle}</div>
                  {item.actions && item.actions.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      {item.actions.slice(0, 4).map((a) => (
                        <button
                          key={`${item.href}-${a.label}-${a.href}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(false);
                            router.push(a.href);
                          }}
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            borderRadius: 999,
                            padding: "2px 7px",
                            background: "color-mix(in srgb, var(--foreground) 6%, var(--surface))",
                            color: "var(--muted)",
                            border: "1px solid color-mix(in srgb, var(--foreground) 10%, var(--border))",
                            cursor: "pointer",
                          }}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </React.Fragment>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
