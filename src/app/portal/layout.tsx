// src/app/portal/layout.tsx
import React from "react";
import PortalLayoutClient from "@/components/portal/PortalLayoutClient";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalLayoutClient>{children}</PortalLayoutClient>;
}
