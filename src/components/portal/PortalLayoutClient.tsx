"use client";

import React from "react";
import { usePathname } from "next/navigation";
import PortalPersistentProcessingOverlay from "@/components/portal/PortalPersistentProcessingOverlay";
import PortalDemoBanner from "@/components/portal/PortalDemoBanner";
import { PortalMobileNavProvider, usePortalMobileNav } from "@/components/portal/PortalMobileNavContext";
import SalesRepPortalSurfaceGuard from "@/components/portal/SalesRepPortalSurfaceGuard";
import Sidebar from "./Sidebar";

export default function PortalLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const salesCommandArea = pathname.startsWith("/portal/sales");


  const contentWrapStyle = React.useMemo(
    () => ({
      ...styles.contentWrap,
      padding: salesCommandArea ? 10 : styles.contentWrap.padding,
    }),
    [salesCommandArea]
  );
  const contentStyle = React.useMemo(
    () => ({
      ...styles.content,
      maxWidth: salesCommandArea ? 1320 : styles.content.maxWidth,
      gap: salesCommandArea ? 10 : styles.content.gap,
    }),
    [salesCommandArea]
  );

  return (
    <PortalMobileNavProvider>
      <PortalShellInner
        pathname={pathname}
        salesCommandArea={salesCommandArea}
        contentWrapStyle={contentWrapStyle}
        contentStyle={contentStyle}
      >
        {children}
      </PortalShellInner>
    </PortalMobileNavProvider>
  );
}

function PortalShellInner({
  children,
  pathname,
  salesCommandArea,
  contentWrapStyle,
  contentStyle,
}: {
  children: React.ReactNode;
  pathname: string;
  salesCommandArea: boolean;
  contentWrapStyle: React.CSSProperties;
  contentStyle: React.CSSProperties;
}) {
  const { menuOpen, toggleMenu, setMenuOpen } = usePortalMobileNav();

  React.useEffect(() => {
    setMenuOpen(false);
  }, [pathname, setMenuOpen]);

  const hideFixedMobileMenu = pathname.startsWith("/portal/sales");

  return (
    <div className="portal-shell" style={styles.shell}>
      <SalesRepPortalSurfaceGuard />
      <PortalPersistentProcessingOverlay />
      {!hideFixedMobileMenu ? (
        <button
          type="button"
          className="portal-mobile-menu-btn portal-mobile-menu-btn--ghost portal-mobile-menu-btn--fixed"
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
        </button>
      ) : null}

      <div
        className={`portal-sidebar-overlay ${menuOpen ? "portal-overlay-visible" : ""}`}
        aria-hidden={!menuOpen}
        onClick={() => setMenuOpen(false)}
      />

      <aside
        className={`portal-sidebar ${menuOpen ? "portal-sidebar-open" : ""}`}
        style={styles.sidebar}
      >
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", width: "100%" }}>
          <Sidebar />
        </div>
      </aside>

      <main className="portal-main" style={styles.main}>
        <div className="portal-contentWrap" style={contentWrapStyle}>
          <div className="portal-content" style={contentStyle}>
            {!salesCommandArea ? <PortalDemoBanner /> : null}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    minHeight: "100vh",
    color: "var(--foreground)",
    background:
      "radial-gradient(1200px 700px at 15% 0%, rgba(14,165,233,0.18), transparent 60%)," +
      "linear-gradient(180deg, #020617 0%, #020617 240px, var(--background) 520px)",
  },
  sidebar: {
    width: 292,
    padding: 16,
    position: "sticky",
    top: 0,
    height: "100vh",
    maxHeight: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    background: "rgba(255,255,255,0.82)",
    borderRight: "1px solid rgba(14,165,233,0.18)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.12)",
    backdropFilter: "blur(10px)",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  contentWrap: {
    padding: 28,
    width: "100%",
  },
  content: {
    maxWidth: 1240,
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
};
