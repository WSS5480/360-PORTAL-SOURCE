"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { supabaseBrowser } from "@/lib/supabase/client";
import AccountSwitcher from "@/components/portal/AccountSwitcher";
import { SalesCommandSidebarNav } from "@/components/portal/SalesCommandSidebarNav";
import { sidebarCommandCss } from "@/components/portal/sidebarCommandCss";

type NavLeaf = { kind: "item"; label: string; href: string };
type NavGroup = {
  kind: "group";
  label: string;
  href: string;
  children: NavLeaf[];
};
type NavItem = NavLeaf | NavGroup;

function buildCustomerNav(virtualWarehouseEnabled: boolean, showAccountUsersLink: boolean): NavItem[] {
  return [
    { kind: "item", label: "Dashboard", href: "/portal" },

    {
      kind: "group",
      label: "IVR Requests",
      href: "/portal/ivr",
      children: [
        { kind: "item", label: "Submit IVR Request", href: "/portal/ivr/new" },
        { kind: "item", label: "Provider Profiles", href: "/portal/provider-profiles" },
      ],
    },

    {
      kind: "group",
      label: "Orders",
      href: "/portal/orders",
      children: [
        { kind: "item", label: "Submit Order", href: "/portal/orders/new" },
        { kind: "item", label: "Invoices", href: "/portal/invoices" },
      ],
    },
    ...(virtualWarehouseEnabled
      ? [{ kind: "item" as const, label: "Virtual warehouse", href: "/portal/virtual-warehouse" }]
      : []),
    { kind: "item", label: "Documents", href: "/portal/documents" },
    ...(showAccountUsersLink ? [{ kind: "item" as const, label: "Account users", href: "/portal/account/users" }] : []),
    { kind: "item", label: "Settings", href: "/portal/settings" },
  ];
}

type InternalNavItem = { label: string; href: string; activePrefixes?: string[] };

const ADMIN_NAV: InternalNavItem[] = [
  { label: "Admin Dashboard", href: "/admin" },
  { label: "Customer portal", href: "/portal" },
  { label: "Sales Playbooks", href: "/admin/sales/playbooks" },
  { label: "IVR Queue", href: "/admin/ivr" },
];

const STAFF_NAV: InternalNavItem[] = [{ label: "IVR Queue", href: "/admin/ivr" }];

const LOGO_SRC = "/brand/360medical-logo.png";

type AnyMe = any;

function pickBool(v: any): boolean {
  return v === true;
}

function normRole(r: string | null | undefined) {
  return String(r || "").trim().toUpperCase();
}

function normalizeMe(me: AnyMe | null): {
  loaded: boolean;
  ok: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isInternalSalesRep: boolean;
  email: string | null;
  name: string | null;
  virtualWarehouseEnabled: boolean;
  isPortalAccountAdmin: boolean;
} {
  if (!me) {
    return {
      loaded: false,
      ok: false,
      isAdmin: false,
      isStaff: false,
      isInternalSalesRep: false,
      email: null,
      name: null,
      virtualWarehouseEnabled: false,
      isPortalAccountAdmin: false,
    };
  }

  const ok = me?.ok === true;

  // Support both possible shapes:
  // A) { ok: true, is_admin, is_staff }
  // B) { ok: true, user: { is_admin, is_staff, is_internal_sales_rep } }
  const isAdmin = ok && (pickBool(me?.is_admin) || pickBool(me?.user?.is_admin));
  const isStaff = ok && (pickBool(me?.is_staff) || pickBool(me?.user?.is_staff));
  const isInternalSalesRep =
    ok && (pickBool((me as AnyMe)?.is_internal_sales_rep) || pickBool(me?.user?.is_internal_sales_rep));

  const email =
    (typeof me?.email === "string" && me.email) ||
    (typeof me?.user?.email === "string" && me.user.email) ||
    null;

  const name =
    (typeof me?.name === "string" && me.name) ||
    (typeof me?.user?.name === "string" && me.user.name) ||
    null;

  // Match /api/portal/me (`!!` on DB boolean); avoid strict `=== true` if the value is ever serialized oddly.
  const virtualWarehouseEnabled = ok && Boolean(me?.virtual_warehouse_enabled);

  const portalAccountRole =
    (typeof me?.portal_account_role === "string" && me.portal_account_role) ||
    (typeof (me as any)?.portal_account_role === "string" && (me as any).portal_account_role) ||
    null;
  const isPortalAccountAdmin = ok && !isAdmin && !isStaff && normRole(portalAccountRole) === "ACCOUNT_ADMIN";

  return {
    loaded: true,
    ok,
    isAdmin,
    isStaff,
    isInternalSalesRep,
    email,
    name,
    virtualWarehouseEnabled,
    isPortalAccountAdmin,
  };
}

function roleLabel(isAdmin: boolean, isStaff: boolean, isInternalSalesRep: boolean) {
  if (isAdmin) return "Admin";
  if (isStaff) return "IVR Team";
  if (isInternalSalesRep) return "Sales rep";
  return "Customer";
}

export default function Sidebar() {
  const pathname = usePathname();
  const [me, setMe] = React.useState<AnyMe | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [logoutErr, setLogoutErr] = React.useState<string | null>(null);
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [supportMessage, setSupportMessage] = React.useState("");
  const [supportScreenshot, setSupportScreenshot] = React.useState<File | null>(null);
  const [supportBusy, setSupportBusy] = React.useState(false);
  const [supportErr, setSupportErr] = React.useState<string | null>(null);
  const [supportOk, setSupportOk] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/portal/me", { cache: "no-store", signal: ac.signal });
        const json = await res.json();
        setMe(json);
      } catch {
        setMe({ ok: false });
      } finally {
        setLoaded(true);
      }
    })();

    return () => ac.abort();
    // Intentionally mount-only: refetching on every pathname duplicates auth work (middleware + getUser)
    // and can worsen refresh-token races. Account switch uses `portal-me-refetch`.
  }, []);

  React.useEffect(() => {
    function refetchMe() {
      void (async () => {
        try {
          const res = await fetch("/api/portal/me", { cache: "no-store" });
          const json = await res.json();
          setMe(json);
        } catch {
          setMe({ ok: false });
        }
      })();
    }
    window.addEventListener("portal-me-refetch", refetchMe);
    return () => window.removeEventListener("portal-me-refetch", refetchMe);
  }, []);

  const state = normalizeMe(me);

  // Staff: IVR queue only. Pure sales reps: Sales Command only (unless they also have a customer account).
  const isAdmin = loaded && state.isAdmin;
  const isStaff = loaded && state.isStaff && !isAdmin;
  const isSalesRepOnly = loaded && state.isInternalSalesRep && !isAdmin && !isStaff;

  const portalMemberships = React.useMemo(() => {
    if (!me || typeof me !== "object" || !("memberships" in me)) return [];
    const raw = (me as { memberships?: unknown }).memberships;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (row): row is { account_id: string; role: string; account: { id: string; name: string } | null } =>
        row !== null &&
        typeof row === "object" &&
        typeof (row as { account_id?: unknown }).account_id === "string" &&
        typeof (row as { role?: unknown }).role === "string"
    );
  }, [me]);

  const hasCustomerAccountAccess =
    (typeof me === "object" &&
      me !== null &&
      (me as { has_customer_account_access?: unknown }).has_customer_account_access === true) ||
    portalMemberships.some((m) => {
      const name = String(m.account?.name || "").trim();
      return name.length > 0 && name !== "360 Medical Internal Team";
    });

  // Wait until /api/portal/me loads so pure sales-rep-only users never flash order/IVR nav.
  const showCustomerSection =
    loaded && (isAdmin || hasCustomerAccountAccess || (!isStaff && !isSalesRepOnly));
  const showInternalSection = isAdmin || isStaff;

  const internalLabel = isAdmin ? "Admin" : "IVR Team";
  const internalNav = isAdmin ? ADMIN_NAV : STAFF_NAV;

  const displayName = state.name && state.name.trim() ? state.name.trim() : null;
  const displayEmail = state.email && state.email.trim() ? state.email.trim() : null;
  const role = roleLabel(isAdmin, isStaff, state.isInternalSalesRep);
  const showSalesSection = state.ok && state.isInternalSalesRep;

  const customerNav = React.useMemo(
    () => buildCustomerNav(state.virtualWarehouseEnabled, state.isPortalAccountAdmin),
    [state.virtualWarehouseEnabled, state.isPortalAccountAdmin]
  );

  async function onLogout() {
    if (loggingOut) return;
    setLogoutErr(null);
    setLoggingOut(true);

    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.signOut();
      if (error) {
        setLogoutErr(error.message);
        return;
      }

      // Keep it simple: always go to login. Preserve a sensible next for after re-auth.
      const next = showCustomerSection ? "/portal" : showSalesSection ? "/portal/sales" : "/admin/ivr";
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    } catch (e) {
      setLogoutErr(e instanceof Error ? e.message : "Sign out failed.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function onSendSupportRequest(e: React.FormEvent) {
    e.preventDefault();
    setSupportErr(null);
    setSupportOk(null);
    const message = supportMessage.trim();
    if (message.length < 10) {
      setSupportErr("Please include a bit more detail in your message.");
      return;
    }
    if (supportScreenshot) {
      if (!supportScreenshot.type.startsWith("image/")) {
        setSupportErr("Screenshot must be an image file.");
        return;
      }
      if (supportScreenshot.size > 5 * 1024 * 1024) {
        setSupportErr("Screenshot must be 5 MB or smaller.");
        return;
      }
    }
    setSupportBusy(true);
    try {
      const form = new FormData();
      form.set("message", message);
      form.set("page", window.location.pathname);
      if (supportScreenshot) form.set("screenshot", supportScreenshot);
      const res = await fetch("/api/portal/support/request", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to send support request.");
      }
      const requestId = typeof json?.requestId === "string" ? json.requestId : null;
      setSupportOk(requestId ? `Request #${requestId} sent. Support will follow up by email.` : "Request sent. Support will follow up by email.");
      setSupportMessage("");
      setSupportScreenshot(null);
    } catch (err) {
      setSupportErr(err instanceof Error ? err.message : "Failed to send support request.");
    } finally {
      setSupportBusy(false);
    }
  }

  // A shimmer placeholder reads better than the word "Loading" in the account row.
  const identityPrimary = displayName || displayEmail || (state.loaded ? "Your account" : null);
  const identitySecondary = displayName && displayEmail ? displayEmail : null;

  return (
    <div className="portal-sidebar-shell">
      <style dangerouslySetInnerHTML={{ __html: sidebarCommandCss }} />
      {/* Brand header — dimensions unchanged */}
      <div className="portal-sidebar-brand-slot portal-sidebar-brand" style={styles.brand}>
        <div className="portal-sidebar-logo-stage" aria-label="360 Medical">
          <img src={LOGO_SRC} alt="360 Medical" className="portal-sidebar-logo-image" />
        </div>
      </div>

      <div className="portal-sidebar-scroll">
        {showCustomerSection ? (
          <div style={styles.section}>
            <div className="portal-sidebar-nav-section-label" style={styles.sectionLabel}>
              Customer
            </div>
            {state.ok && portalMemberships.length > 1 ? (
              <div style={styles.accountSwitchWrap}>
                <AccountSwitcher
                  memberships={portalMemberships}
                  currentAccountId={
                    typeof (me as { currentAccountId?: unknown })?.currentAccountId === "string"
                      ? (me as { currentAccountId: string }).currentAccountId
                      : null
                  }
                />
              </div>
            ) : null}
            <nav style={styles.nav}>
              {customerNav.map((item) => (
                <NavNode key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
        ) : null}

        {showSalesSection ? (
          <Suspense
            fallback={<div style={{ padding: "4px 8px", fontSize: 12, color: "var(--muted)" }}>Loading nav…</div>}
          >
            <SalesCommandSidebarNav />
          </Suspense>
        ) : null}

        {showInternalSection ? (
          <div style={styles.section}>
            <div className="portal-sidebar-nav-section-label" style={styles.sectionLabel}>
              {internalLabel}
            </div>
            <nav style={styles.nav}>
              {internalNav.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
        ) : null}
      </div>

      <footer className="portal-sidebar-footer" aria-label="Account">
        <div className="portal-sidebar-footer__identity">
          <div className="portal-sidebar-footer__text">
            {identityPrimary ? (
              <span className="portal-sidebar-footer__name" title={identityPrimary}>
                {identityPrimary}
              </span>
            ) : (
              <span className="portal-sidebar-footer__skeleton" aria-hidden />
            )}
            {identitySecondary ? (
              <span className="portal-sidebar-footer__email" title={identitySecondary}>
                {identitySecondary}
              </span>
            ) : null}
          </div>
          {/* Held back until the profile loads so a sales rep never flashes "Customer". */}
          {state.loaded ? (
            <span className="portal-sidebar-footer__role" aria-label="Role">
              {role}
            </span>
          ) : null}
        </div>
        <div className="portal-sidebar-footer__actions">
          <button
            type="button"
            className="portal-sidebar-footer__btn"
            onClick={() => {
              setSupportOpen(true);
              setSupportErr(null);
              setSupportOk(null);
              setSupportMessage("");
              setSupportScreenshot(null);
            }}
          >
            Support
          </button>
          <button
            type="button"
            className="portal-sidebar-footer__btn portal-sidebar-footer__btn--muted"
            onClick={onLogout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
        {logoutErr ? (
          <div role="alert" className="portal-sidebar-footer__err">
            {logoutErr}
          </div>
        ) : null}
      </footer>

      {mounted && supportOpen
        ? createPortal(
            <div
              style={styles.modalBackdrop}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget && !supportBusy) setSupportOpen(false);
              }}
            >
              <div style={styles.modalCard}>
                <div style={styles.modalTitle}>Portal support request</div>
                <form onSubmit={onSendSupportRequest} style={{ display: "grid", gap: 10 }}>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your issue or question..."
                    maxLength={4000}
                    rows={7}
                    style={{ ...styles.modalInput, resize: "vertical", minHeight: 150, fontFamily: "inherit" }}
                  />
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={styles.modalHint}>Optional screenshot (PNG, JPG, WEBP, GIF up to 5 MB)</label>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => setSupportScreenshot(e.target.files?.[0] ?? null)}
                      style={styles.modalInput}
                    />
                    {supportScreenshot ? (
                      <div style={styles.modalHint}>
                        Attached: {supportScreenshot.name} ({Math.max(1, Math.round(supportScreenshot.size / 1024))} KB)
                      </div>
                    ) : null}
                  </div>
                  <div style={styles.modalHint}>Request number is assigned automatically when sent.</div>
                  {supportErr ? <div style={styles.modalErr}>{supportErr}</div> : null}
                  {supportOk ? <div style={styles.modalOk}>{supportOk}</div> : null}
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setSupportOpen(false)} disabled={supportBusy} style={styles.modalGhostBtn}>
                      Close
                    </button>
                    <button type="submit" disabled={supportBusy} style={styles.modalPrimaryBtn}>
                      {supportBusy ? "Sending..." : "Send request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function NavNode({ item, pathname }: { item: NavItem; pathname: string }) {
  if (item.kind === "group") {
    const groupActive =
      isActive(pathname, item.href) || item.children.some((c) => isActive(pathname, c.href));

    return (
      <div style={styles.groupWrap}>
        <NavLink item={{ label: item.label, href: item.href }} pathname={pathname} forceActive={groupActive} />
        <div style={styles.groupChildren}>
          {item.children.map((c) => (
            <SubNavLink key={c.href} item={c} pathname={pathname} parentActive={groupActive} />
          ))}
        </div>
      </div>
    );
  }

  return <NavLink item={item} pathname={pathname} />;
}

function NavLink({
  item,
  pathname,
  forceActive,
}: {
  item: InternalNavItem;
  pathname: string;
  forceActive?: boolean;
}) {
  const prefixActive = item.activePrefixes?.some((prefix) => isActive(pathname, prefix)) ?? false;
  const active = forceActive ?? (prefixActive || isActive(pathname, item.href));
  const [hover, setHover] = React.useState(false);
  const showHover = hover && !active;

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.item,
        ...(active ? styles.itemActive : null),
        ...(showHover ? styles.itemHover : null),
      }}
      aria-current={active ? "page" : undefined}
      className="portal-sidebar-nav-link"
    >
      <span aria-hidden style={{ ...styles.activeBar, ...(active ? styles.activeBarOn : null) }} />
      <span
        className="portal-sidebar-nav-link__label"
        style={{ ...styles.itemLabel, ...(active ? styles.itemLabelActive : null) }}
      >
        {item.label}
      </span>
      <span
        aria-hidden
        style={{
          ...styles.chev,
          ...(active ? styles.chevOn : null),
          ...(showHover ? styles.chevHover : null),
        }}
      >
        →
      </span>
    </Link>
  );
}

function SubNavLink({
  item,
  pathname,
  parentActive,
}: {
  item: NavLeaf;
  pathname: string;
  parentActive: boolean;
}) {
  const active = isActive(pathname, item.href);
  const [hover, setHover] = React.useState(false);
  const showHover = hover && !active;

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.subItem,
        ...(active ? styles.subItemActive : null),
        ...(showHover ? styles.subItemHover : null),
        ...(parentActive ? styles.subItemParentOn : null),
      }}
      aria-current={active ? "page" : undefined}
      className="portal-sidebar-subnav-link"
    >
      <span aria-hidden style={{ ...styles.subDot, ...(active ? styles.subDotOn : null) }} />
      <span
        className="portal-sidebar-subnav-link__label"
        style={{ ...styles.subLabel, ...(active ? styles.subLabelOn : null) }}
      >
        {item.label}
      </span>
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (!pathname) return false;
  const base = href.split("?")[0].replace(/\/$/, "") || "/";
  if (pathname === base || pathname === `${base}/`) return true;
  // Bare app roots must not stay active on every nested page.
  if (base === "/portal" || base === "/admin") return false;
  return pathname.startsWith(`${base}/`);
}

/**
 * IMPORTANT:
 * No `border` shorthand anywhere (avoids React warning).
 */
const styles: Record<string, React.CSSProperties> = {
  brand: {
    borderRadius: 16,
    padding: 8,
    background:
      "radial-gradient(900px 260px at 15% 0%, rgba(30,136,229,0.20), transparent 60%)," +
      "linear-gradient(180deg, rgba(6,18,37,0.92), rgba(5,11,22,0.92))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.10)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
  },

  brandTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },

  brandTitle: {
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.9,
    color: "rgba(255,255,255,0.84)",
  },

  section: { display: "flex", flexDirection: "column", gap: 6 },

  accountSwitchWrap: {
    paddingLeft: 10,
    paddingRight: 10,
    marginBottom: 2,
  },

  sectionLabel: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: 0.1,
    textTransform: "uppercase",
    color: "color-mix(in srgb, var(--muted) 88%, black)",
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 2,
  },

  nav: { display: "flex", flexDirection: "column", gap: 2 },

  item: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 9,
    textDecoration: "none",
    color: "var(--foreground)",
    minHeight: 40,
    background: "transparent",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
  },

  itemHover: {
    background: "color-mix(in srgb, var(--brand-050) 40%, transparent)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 10%, var(--border))",
  },

  itemActive: {
    background: "color-mix(in srgb, #22d3ee 8%, color-mix(in srgb, var(--brand-050) 85%, #fff))",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, #22d3ee 20%, var(--border))",
    color: "var(--brand-700)",
    boxShadow: "inset 3px 0 0 var(--brand-600)",
    paddingLeft: 8,
  },

  activeBar: {
    width: 0,
    height: 0,
    flex: "0 0 auto",
    overflow: "hidden",
  },

  activeBarOn: { width: 0, height: 0 },

  itemLabel: { fontSize: 13, fontWeight: 750, lineHeight: 1.2, flex: 1, minWidth: 0 },
  itemLabelActive: { fontWeight: 900 },

  chev: {
    opacity: 0,
    transform: "translateX(-2px)",
    transition: "opacity 120ms ease, transform 120ms ease",
    fontWeight: 950,
    color: "color-mix(in srgb, var(--brand-700) 85%, black)",
  },

  chevHover: { opacity: 0.6, transform: "translateX(0)" },
  chevOn: { opacity: 0.9, transform: "translateX(0)" },

  // ✅ Group / sublinks
  groupWrap: { display: "flex", flexDirection: "column", gap: 6 },
  groupChildren: { display: "flex", flexDirection: "column", gap: 6, paddingLeft: 16 },

  subItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    textDecoration: "none",
    color: "color-mix(in srgb, var(--muted) 70%, black)",
    background: "transparent",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "transparent",
    transition: "background 120ms ease, border-color 120ms ease, transform 120ms ease",
  },

  subItemParentOn: {
    background: "color-mix(in srgb, var(--brand-050) 35%, transparent)",
  },

  subItemHover: {
    background: "color-mix(in srgb, var(--brand-050) 45%, transparent)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 10%, var(--border))",
    transform: "translateY(-0.5px)",
  },

  subItemActive: {
    background: "var(--brand-050)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 18%, var(--border))",
    color: "var(--brand-700)",
  },

  subDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    background: "rgba(0,0,0,0.14)",
    flex: "0 0 auto",
  },

  subDotOn: { background: "var(--brand-600)" },

  subLabel: { fontSize: 13, fontWeight: 850, lineHeight: 1.2, flex: 1, minWidth: 0 },
  subLabelOn: { fontWeight: 950 },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 140,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "min(520px, 100%)",
    borderRadius: 14,
    background: "var(--surface)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    padding: 16,
    boxShadow: "0 24px 60px rgba(0,0,0,0.24)",
    display: "grid",
    gap: 12,
  },
  modalTitle: { margin: 0, fontSize: 16, fontWeight: 950, color: "var(--foreground)" },
  modalHint: { fontSize: 12, color: "var(--muted)", fontWeight: 700 },
  modalInput: {
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 14%, var(--border))",
    padding: "10px 12px",
    fontSize: 14,
    color: "var(--foreground)",
    background: "white",
  },
  modalPrimaryBtn: {
    padding: "9px 12px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
  },
  modalGhostBtn: {
    padding: "9px 12px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    background: "white",
    color: "var(--foreground)",
    fontWeight: 800,
    cursor: "pointer",
  },
  modalErr: {
    color: "rgb(153,27,27)",
    background: "rgba(220,38,38,0.08)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(220,38,38,0.22)",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 700,
  },
  modalOk: {
    color: "rgb(21,128,61)",
    background: "rgba(16,185,129,0.08)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(16,185,129,0.24)",
    borderRadius: 10,
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 700,
  },

};
