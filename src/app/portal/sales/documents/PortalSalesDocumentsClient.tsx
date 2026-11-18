"use client";

import React from "react";
import { ScMobileListHeaderRow } from "@/components/sales/ScMobileListHeaderRow";
import { SalesCommandPage, sc } from "@/components/sales/salesCommandUi";
import {
  fileTypeLabel,
  getYouTubeVideoId,
} from "@/lib/documents/salesCommandDocumentDisplay";
import type { SalesCommandDocumentFile, SalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentTypes";
import { userFacingError } from "@/lib/errors/userFacingError";

function FolderSection({
  folder,
  depth,
  expanded,
  onToggle,
}: {
  folder: SalesCommandDocumentFolder;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = (folder.subfolders?.length ?? 0) > 0;
  const hasFiles = (folder.files?.length ?? 0) > 0;
  const isOpen = expanded.has(folder.id);
  const fileCount = (folder.files?.length ?? 0) + (folder.subfolders ?? []).reduce((n, s) => n + (s.files?.length ?? 0), 0);

  return (
    <div style={{ marginLeft: depth ? 10 : 0 }}>
      <div
        style={{
          border: "1px solid color-mix(in srgb, var(--brand-600) 12%, var(--border))",
          borderRadius: 14,
          background: "#fff",
          overflow: "hidden",
          marginBottom: 10,
        }}
      >
        <button
          type="button"
          onClick={() => onToggle(folder.id)}
          style={{
            width: "100%",
            border: "none",
            background: "color-mix(in srgb, var(--brand-050) 55%, white)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 950, color: "var(--brand-700)" }}>{hasChildren || hasFiles ? (isOpen ? "▾" : "▸") : "•"}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 950, fontSize: 15, letterSpacing: "-0.02em" }}>{folder.name}</span>
            {folder.description ? (
              <span style={{ display: "block", fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.4 }}>
                {folder.description}
              </span>
            ) : null}
          </span>
          {fileCount > 0 ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "var(--brand-700)",
                background: "color-mix(in srgb, var(--brand-050) 70%, white)",
                border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
                borderRadius: 999,
                padding: "3px 8px",
              }}
            >
              {fileCount}
            </span>
          ) : null}
        </button>

        {isOpen ? (
          <div style={{ padding: "10px 12px 12px", display: "grid", gap: 8 }}>
            {folder.files?.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
            {!folder.files?.length && !hasChildren ? (
              <div style={{ fontSize: 12.5, color: "var(--muted)", padding: "4px 2px" }}>No documents in this folder yet.</div>
            ) : null}
          </div>
        ) : null}
      </div>

      {isOpen
        ? folder.subfolders?.map((sub) => (
            <FolderSection key={sub.id} folder={sub} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
          ))
        : null}
    </div>
  );
}

function FileCard({ file }: { file: SalesCommandDocumentFile }) {
  const isLink = !!file.external_url;
  const youtubeId = isLink ? getYouTubeVideoId(file.external_url) : null;
  const href = isLink ? file.external_url! : `/api/portal/sales/documents/files/${file.id}/download`;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "12px 14px",
        display: "grid",
        gap: 10,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 52,
            padding: "5px 8px",
            borderRadius: 10,
            border: "1px solid color-mix(in srgb, var(--brand-600) 18%, var(--border))",
            background: "color-mix(in srgb, var(--brand-050) 70%, white)",
            fontSize: 11,
            fontWeight: 950,
            color: "var(--brand-700)",
          }}
        >
          {fileTypeLabel(file)}
        </span>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{file.title}</div>
          {!isLink && file.filename ? (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{file.filename}</div>
          ) : null}
        </div>
        <a
          href={href}
          target={isLink ? "_blank" : undefined}
          rel={isLink ? "noreferrer" : undefined}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid color-mix(in srgb, var(--brand-600) 16%, var(--border))",
            background: "var(--brand-600)",
            color: "white",
            fontWeight: 900,
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          {isLink ? "Open" : "Download"}
        </a>
      </div>
      {youtubeId ? (
        <div style={{ width: "100%", maxWidth: 640, aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", background: "#000" }}>
          <iframe
            title={file.title}
            src={`https://www.youtube.com/embed/${youtubeId}`}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}
    </div>
  );
}

export default function PortalSalesDocumentsClient() {
  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [tree, setTree] = React.useState<SalesCommandDocumentFolder[]>([]);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch("/api/portal/sales/documents", { cache: "no-store" });
        const j = (await res.json()) as { ok?: boolean; error?: string; tree?: SalesCommandDocumentFolder[] };
        if (!j.ok) throw new Error(j.error || "");
        if (!cancelled) {
          const nextTree = j.tree ?? [];
          setTree(nextTree);
          setExpanded(new Set(nextTree.map((f) => f.id)));
        }
      } catch (e) {
        if (!cancelled) setErr(userFacingError(e, "We could not load documents. Please try again."));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleFolder(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const totalFiles = tree.reduce((sum, folder) => {
    const countIn = (node: SalesCommandDocumentFolder): number =>
      (node.files?.length ?? 0) + (node.subfolders ?? []).reduce((n, s) => n + countIn(s), 0);
    return sum + countIn(folder);
  }, 0);

  return (
    <SalesCommandPage
      title="Documents"
      subtitle="Sales resources, training, and field materials."
      omitBuiltInHeader
      nativeLayout
      actions={null}
    >
      <div className="sc-native-page surgical-cases-mobile-root">
        <div className="sc-mobile-list-sticky-shell">
          <header className="sc-mobile-list-header">
            <ScMobileListHeaderRow
              title="Documents"
              countLabel={busy ? "Loading…" : `${totalFiles} resources`}
            />
          </header>
        </div>
        <div className="sc-mobile-list-body" style={{ padding: "10px 12px 20px" }}>
          {err ? <div style={{ ...sc.alertError, marginBottom: 10 }}>{err}</div> : null}
          {busy ? <div style={{ padding: "8px 0", color: "var(--muted)", fontSize: 13 }}>Loading documents…</div> : null}
          {!busy && !tree.length ? (
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: 14,
                padding: 20,
                color: "var(--muted)",
                fontSize: 13,
                lineHeight: 1.5,
                background: "#fff",
              }}
            >
              No documents have been published for your team yet. Your admin can add folders and files in Portal setup.
            </div>
          ) : null}
          {!busy && tree.length > 0 ? (
            <div style={{ display: "grid", gap: 4 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>
                Folders you can access based on your role. Territory-manager-only content is labeled in setup.
              </p>
              {tree.map((folder) => (
                <FolderSection key={folder.id} folder={folder} depth={0} expanded={expanded} onToggle={toggleFolder} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </SalesCommandPage>
  );
}
