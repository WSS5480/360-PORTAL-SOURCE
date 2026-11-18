"use client";

import React from "react";
import type { AdminSetupSnapshot } from "@/lib/admin/adminSetupTypes";
import SalesCommandDocumentsManager from "./documents/SalesCommandDocumentsManager";

type ToastPush = (kind: "success" | "error" | "info", text: string, opts?: { sticky?: boolean }) => void;

type Props = {
  snapshot: AdminSetupSnapshot;
  push: ToastPush;
  refreshSnapshot: () => Promise<void>;
};

export default function SalesCommandDocumentsStep({ snapshot, push, refreshSnapshot }: Props) {
  return (
    <SalesCommandDocumentsManager
      push={push}
      stats={snapshot.documents}
      onLibraryChange={refreshSnapshot}
    />
  );
}
