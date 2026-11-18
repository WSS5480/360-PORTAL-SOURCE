"use client";

import React from "react";
import { usePortalMobileNav } from "./PortalMobileNavContext";

export function PortalMobileMenuButton({
  className = "",
}: {
  className?: string;
}) {
  const { menuOpen, toggleMenu } = usePortalMobileNav();

  return (
    <button
      type="button"
      className={`portal-mobile-menu-btn portal-mobile-menu-btn--ghost ${className}`.trim()}
      onClick={toggleMenu}
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      aria-expanded={menuOpen}
    >
      <span aria-hidden>{menuOpen ? "✕" : "☰"}</span>
    </button>
  );
}
