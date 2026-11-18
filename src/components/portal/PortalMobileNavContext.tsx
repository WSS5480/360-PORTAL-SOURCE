"use client";

import React from "react";

type PortalMobileNavContextValue = {
  menuOpen: boolean;
  toggleMenu: () => void;
  setMenuOpen: (open: boolean) => void;
};

const PortalMobileNavContext = React.createContext<PortalMobileNavContextValue | null>(null);

export function PortalMobileNavProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const value = React.useMemo(
    () => ({
      menuOpen,
      setMenuOpen,
      toggleMenu: () => setMenuOpen((o) => !o),
    }),
    [menuOpen],
  );

  return <PortalMobileNavContext.Provider value={value}>{children}</PortalMobileNavContext.Provider>;
}

export function usePortalMobileNav() {
  const ctx = React.useContext(PortalMobileNavContext);
  if (!ctx) {
    throw new Error("usePortalMobileNav must be used within PortalMobileNavProvider");
  }
  return ctx;
}
