"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { AdminNotificationsHost } from "@/components/admin/AdminNotificationsHost";

type MeShape =
  | {
      ok?: boolean;
      email?: string | null;
      name?: string | null;
      is_admin?: boolean;
      is_staff?: boolean;
      user?: { email?: string | null; name?: string | null; is_admin?: boolean; is_staff?: boolean };
    }
  | any;

function pickBool(v: any): boolean {
  return v === true;
}

function normalizeMe(me: MeShape | null): {
  loaded: boolean;
  ok: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  email: string | null;
  name: string | null;
} {
  if (!me) return { loaded: false, ok: false, isAdmin: false, isStaff: false, email: null, name: null };

  const ok = me?.ok === true;

  const isAdmin = ok && (pickBool(me?.is_admin) || pickBool(me?.user?.is_admin));
  const isStaff = ok && (pickBool(me?.is_staff) || pickBool(me?.user?.is_staff));

  const email =
    (typeof me?.email === "string" && me.email) ||
    (typeof me?.user?.email === "string" && me.user.email) ||
    null;

  const name =
    (typeof me?.name === "string" && me.name) ||
    (typeof me?.user?.name === "string" && me.user.name) ||
    null;

  return { loaded: true, ok, isAdmin, isStaff, email, name };
}

function roleLabel(isAdmin: boolean, isStaff: boolean) {
  if (isAdmin) return "Admin";
  if (isStaff) return "IVR Team";
  return "Staff";
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

function Divider() {
  return <div aria-hidden style={{ width: 1, height: 26, background: "rgba(0,0,0,0.08)" }} />;
}

function dot(color: string): React.CSSProperties {
  return { width: 8, height: 8, borderRadius: 999, background: color };
}

function smallPill(tone: "admin" | "staff"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
    borderWidth: 1,
    borderStyle: "solid",
  };

  if (tone === "admin") {
    return {
      ...base,
      background: "rgba(0,0,0,0.02)",
      borderColor: "rgba(0,0,0,0.12)",
      color: "#111",
    };
  }

  return {
    ...base,
    background: "var(--brand-050)",
    borderColor: "color-mix(in srgb, var(--brand-600) 22%, var(--border))",
    color: "var(--brand-800)",
  };
}

function navItemBase(active: boolean, emphasize?: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    paddingTop: 9,
    paddingBottom: 9,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 14,
    textDecoration: "none",
    color: active ? "var(--brand-700)" : "var(--foreground)",
    fontWeight: emphasize ? 950 : active ? 950 : 850,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: "nowrap",
    userSelect: "none",
    cursor: "pointer",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active
      ? "color-mix(in srgb, var(--brand-600) 22%, var(--border))"
      : emphasize
        ? "rgba(0,0,0,0.12)"
        : "rgba(0,0,0,0.10)",
    background: active ? "var(--brand-050)" : emphasize ? "rgba(0,0,0,0.02)" : "transparent",
    transition: "background 120ms ease, border-color 120ms ease, transform 120ms ease",
  };
}

function navItemHover(): React.CSSProperties {
  return {
    background: "color-mix(in srgb, var(--brand-050) 45%, transparent)",
    borderColor: "color-mix(in srgb, var(--brand-600) 18%, rgba(0,0,0,0.10))",
    transform: "translateY(-0.5px)",
  };
}

function menuItemStyle(active?: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 14,
    textDecoration: "none",
    color: active ? "var(--brand-700)" : "var(--foreground)",
    fontWeight: active ? 950 : 850,
    fontSize: 13,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: active ? "color-mix(in srgb, var(--brand-600) 18%, var(--border))" : "transparent",
    background: active ? "var(--brand-050)" : "transparent",
    userSelect: "none",
    cursor: "pointer",
    transition: "background 120ms ease, border-color 120ms ease, transform 120ms ease",
  };
}

function Brand() {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: "var(--brand-600)",
        boxShadow: "0 0 0 6px color-mix(in srgb, var(--brand-600) 14%, transparent)",
      }}
    />
  );
}

/** ✅ Dropdown group that does NOT steal pointer / cursor, and won't disappear when moving into it */
function MenuGroup({
  label,
  children,
  active,
}: {
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const closeTimer = React.useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openNow() {
    clearCloseTimer();
    setOpen(true);
  }

  function closeSoon() {
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }

  // important: keep cursor normal (pointer is fine) and do NOT use contentEditable anywhere
  const btnStyle: React.CSSProperties = {
    ...navItemBase(Boolean(active), false),
    cursor: "pointer",
  };

  const showHover = hover && !active && !open;

  return (
    <div
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      onMouseEnter={() => {
        setHover(true);
        openNow();
      }}
      onMouseLeave={() => {
        setHover(false);
        closeSoon();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        // focus handling that won't immediately close while tabbing inside
        onFocus={openNow}
        onBlur={(e) => {
          // If focus is moving into the menu, don't close.
          const next = e.relatedTarget as HTMLElement | null;
          if (next && next.closest?.('[data-menu="1"]')) return;
          closeSoon();
        }}
        style={{
          ...btnStyle,
          ...(open ? navItemHover() : null),
          ...(showHover ? navItemHover() : null),
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span style={{ opacity: 0.92 }}>{label}</span>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: open ? "var(--brand-600)" : "rgba(0,0,0,0.22)",
            transition: "background 120ms ease",
          }}
        />
        <span aria-hidden style={{ opacity: 0.65, fontWeight: 950 }}>
          ▾
        </span>
      </button>

      {open ? (
        <div
          data-menu="1"
          role="menu"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            minWidth: 260,
            paddingTop: 8,
            paddingRight: 10,
            paddingBottom: 10,
            paddingLeft: 10,
            borderRadius: 16,
            background: "var(--surface)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "color-mix(in srgb, var(--brand-600) 12%, var(--border))",
            boxShadow: "var(--shadow-1)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  const [hover, setHover] = React.useState(false);
  const showHover = hover && !active;

  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...menuItemStyle(active), ...(showHover ? navItemHover() : null) }}
      aria-current={active ? "page" : undefined}
    >
      <span
        aria-hidden
        style={{
          width: 4,
          height: 18,
          borderRadius: 999,
          background: active ? "var(--brand-600)" : "transparent",
        }}
      />
      <span style={{ flex: 1 }}>{label}</span>
      <span aria-hidden style={{ opacity: showHover || active ? 0.75 : 0, transition: "opacity 120ms ease" }}>
        →
      </span>
    </Link>
  );
}

function NavLink({ href, label, emphasize }: { href: string; label: string; emphasize?: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  const [hover, setHover] = React.useState(false);
  const showHover = hover && !active;

  return (
    <Link
      href={href}
      style={{
        ...navItemBase(active, emphasize),
        ...(showHover ? navItemHover() : null),
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-current={active ? "page" : undefined}
    >
      <span
        aria-hidden
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: active ? "var(--brand-600)" : "rgba(0,0,0,0.18)",
        }}
      />
      {label}
    </Link>
  );
}

export default function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  const [me, setMe] = React.useState<MeShape | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  const [loggingOut, setLoggingOut] = React.useState(false);
  const [logoutErr, setLogoutErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/portal/me", { cache: "no-store", signal: ac.signal });
        const json = await res.json().catch(() => null);
        setMe(json);
      } catch {
        setMe({ ok: false });
      } finally {
        setLoaded(true);
      }
    })();

    return () => ac.abort();
  }, []);

  const state = normalizeMe(me);
  const isStaff = loaded && state.isStaff && !state.isAdmin;
  const role = roleLabel(state.isAdmin, isStaff);

  const displayName =
    (state.name && state.name.trim()) ||
    (state.email && state.email.trim()) ||
    (loaded ? "Unknown user" : "Loading…");

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

      const next = isAdmin ? "/admin" : "/admin/ivr";
      window.location.href = `/login?next=${encodeURIComponent(next)}`;
    } catch (e) {
      setLogoutErr(e instanceof Error ? e.message : "Sign out failed.");
    } finally {
      setLoggingOut(false);
    }
  }

  const showOps = isAdmin;
  const opsActive =
    pathname.startsWith("/admin/orders") ||
    pathname.startsWith("/admin/invoices") ||
    pathname.startsWith("/admin/inventory") ||
    pathname.startsWith("/admin/products");

  const accountsActive =
    pathname.startsWith("/admin/accounts") ||
    pathname.startsWith("/admin/people") ||
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/invite");

  const salesActive =
    pathname.startsWith("/admin/sales") ||
    pathname.startsWith("/admin/setup") ||
    pathname.startsWith("/admin/documents");

  return (
    <header
      style={{
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 14,
        paddingRight: 14,
        borderBottomWidth: 1,
        borderBottomStyle: "solid",
        borderBottomColor: "color-mix(in srgb, var(--brand-600) 10%, var(--border))",
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--surface)",
        position: "relative", // ✅ not sticky
        zIndex: 10,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <Link
          href={isAdmin ? "/admin" : "/admin/ivr"}
          style={{
            textDecoration: "none",
            fontWeight: 950,
            letterSpacing: -0.2,
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 14,
            background:
              "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
              "linear-gradient(180deg, #061225, #050b16)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(255,255,255,0.12)",
            boxShadow: "var(--shadow-1)",
            color: "rgba(255,255,255,0.92)",
            whiteSpace: "nowrap",
            lineHeight: 1,
            userSelect: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <Brand />
          360 Admin
        </Link>

        <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 13, alignItems: "center" }}>
          {isAdmin ? <NavLink href="/admin" label="Dashboard" emphasize /> : null}
          {isAdmin ? <NavLink href="/admin/integrations" label="Integrations" /> : null}
          {isAdmin ? <NavLink href="/portal" label="Customer portal" /> : null}

          <MenuGroup label="IVR" active={pathname.startsWith("/admin/ivr")}>
            <MenuLink href="/admin/ivr" label="Queue" />
            <MenuLink href="/admin/ivr/intake" label="New IVR Intake" />
          </MenuGroup>

          {showOps ? (
            <MenuGroup label="Ops" active={opsActive}>
              <MenuLink href="/admin/orders" label="Orders" />
              <MenuLink href="/admin/invoices" label="Invoices" />
              <MenuLink href="/admin/inventory" label="Inventory" />
              <MenuLink href="/admin/products" label="Products" />
            </MenuGroup>
          ) : null}

          {showOps ? (
            <MenuGroup label="Sales" active={salesActive || pathname.startsWith("/admin/setup")}>
              <MenuLink href="/admin/setup" label="Portal setup" />
              <MenuLink href="/admin/sales/team-dashboard" label="Team dashboard" />
              <MenuLink href="/admin/sales/biotissue-revenue" label="BioTissue revenue" />
              <MenuLink href="/admin/sales/time-off" label="Time off requests" />
              <MenuLink href="/admin/sales/playbooks" label="Playbooks" />
              <MenuLink href="/admin/documents" label="Documents" />
              <MenuLink href="/admin/sales/leaderboard" label="Leaderboard scoring" />
            </MenuGroup>
          ) : null}

          {showOps ? (
            <MenuGroup label="Accounts" active={accountsActive}>
              <MenuLink href="/admin/accounts" label="Accounts" />
              <MenuLink href="/admin/accounts/virtual-balances" label="Virtual balances" />
              <MenuLink href="/admin/people" label="People" />
              <MenuLink href="/admin/users" label="Users" />
              <MenuLink href="/admin/invites" label="Invites" />
              <MenuLink href="/admin/invite" label="New invite" />
            </MenuGroup>
          ) : null}
        </nav>
      </div>

      <div style={{ flex: 1, minWidth: 0 }} aria-hidden />

      {/* Right */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {isAdmin ? <AdminNotificationsHost isAdmin={isAdmin} /> : null}

        <span style={smallPill(isAdmin ? "admin" : "staff")}>
          <span aria-hidden style={dot(isAdmin ? "rgba(0,0,0,0.35)" : "var(--brand-600)")} />
          {role}
        </span>

        <Divider />

        <div
          style={{
            paddingTop: 7,
            paddingBottom: 7,
            paddingLeft: 10,
            paddingRight: 10,
            borderRadius: 999,
            background: "rgba(0,0,0,0.02)",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "rgba(0,0,0,0.10)",
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
            maxWidth: 240,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={displayName}
        >
          {displayName}
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          style={{
            paddingTop: 9,
            paddingBottom: 9,
            paddingLeft: 12,
            paddingRight: 12,
            borderRadius: 14,
            background: "white",
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: "color-mix(in srgb, var(--brand-600) 14%, var(--border))",
            boxShadow: "var(--shadow-1)",
            cursor: loggingOut ? "not-allowed" : "pointer",
            fontWeight: 950,
            color: "color-mix(in srgb, var(--foreground) 85%, black)",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            userSelect: "none",
            whiteSpace: "nowrap",
          }}
          title="Sign out"
        >
          <span aria-hidden style={{ fontWeight: 950, opacity: 0.85 }}>
            ⎋
          </span>
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>

        {logoutErr ? (
          <div
            role="alert"
            style={{
              marginLeft: 8,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 10,
              paddingRight: 10,
              borderRadius: 14,
              background: "rgba(220, 38, 38, 0.10)",
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: "rgba(220, 38, 38, 0.25)",
              color: "rgb(153, 27, 27)",
              fontWeight: 900,
              fontSize: 12,
              lineHeight: 1.35,
              maxWidth: 320,
            }}
          >
            {logoutErr}
          </div>
        ) : null}
      </div>
    </header>
  );
}
