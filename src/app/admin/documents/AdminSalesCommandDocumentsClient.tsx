"use client";

import React from "react";
import Link from "next/link";
import SalesCommandDocumentsManager from "@/app/admin/setup/documents/SalesCommandDocumentsManager";
import styles from "./adminDocuments.module.css";

type Toast = { id: number; kind: "success" | "error" | "info"; text: string; sticky?: boolean };

function useToasts() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((kind: Toast["kind"], text: string, opts?: { sticky?: boolean }) => {
    const id = Date.now() + Math.random();
    const sticky = opts?.sticky ?? kind === "error";
    setToasts((prev) => [...prev, { id, kind, text, sticky }]);
    if (!sticky) {
      const ms = kind === "success" ? 4200 : 8000;
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ms);
    }
  }, []);
  const dismiss = React.useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, push, dismiss };
}

function ToastHost({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: number) => void }) {
  return (
    <div className={styles.toastHost}>
      {toasts.map((t) => {
        const tone =
          t.kind === "success"
            ? { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#166534", icon: "✓" }
            : t.kind === "error"
              ? { bg: "#fef2f2", bd: "#fecaca", fg: "#b91c1c", icon: "!" }
              : { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8", icon: "i" };
        return (
          <div
            key={t.id}
            className={styles.toast}
            style={{ background: tone.bg, border: `1px solid ${tone.bd}` }}
          >
            <span className={styles.toastIcon} style={{ color: tone.fg }}>
              {tone.icon}
            </span>
            <div className={styles.toastText} style={{ color: tone.fg }}>
              <div>{t.text}</div>
              {t.sticky ? <div className={styles.toastStickyHint}>Stays until you dismiss</div> : null}
            </div>
            <button
              type="button"
              className={styles.toastDismiss}
              style={{ color: tone.fg }}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminSalesCommandDocumentsClient() {
  const { toasts, push, dismiss } = useToasts();

  return (
    <>
      <ToastHost toasts={toasts} dismiss={dismiss} />
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <div className={styles.eyebrow}>Sales Command</div>
            <h1 className={styles.title}>Documents</h1>
            <p className={styles.subtitle}>
              Build the resource library your field team browses in Sales Command. Organize folders, upload files, and
              set who can view each folder.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/admin" className={styles.headerLink}>
              ← Admin
            </Link>
            <Link href="/portal/sales/documents" className={styles.headerLink}>
              Open as rep
            </Link>
          </div>
        </header>

        <SalesCommandDocumentsManager push={push} />
      </div>
    </>
  );
}
