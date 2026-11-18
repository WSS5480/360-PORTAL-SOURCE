"use client";

import React from "react";
import { getYouTubeVideoId, fileTypeLabel } from "@/lib/documents/salesCommandDocumentDisplay";
import type { SalesCommandDocumentFolder } from "@/lib/sales-command/salesCommandDocumentTypes";
import styles from "./documents.module.css";

type Props = {
  folder: SalesCommandDocumentFolder;
  onClose: () => void;
};

function RepFolderPreview({ folder, depth }: { folder: SalesCommandDocumentFolder; depth: number }) {
  const [open, setOpen] = React.useState(true);
  const hasChildren = (folder.subfolders?.length ?? 0) > 0;
  const hasFiles = (folder.files?.length ?? 0) > 0;

  return (
    <div style={{ marginLeft: depth ? 12 : 0 }}>
      <div className={styles.panel} style={{ marginBottom: 10, overflow: "hidden" }}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            border: "none",
            background: "rgba(248,250,252,0.9)",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-700)" }}>{open ? "−" : "+"}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>{folder.name}</span>
            {folder.description ? (
              <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{folder.description}</span>
            ) : null}
          </span>
        </button>
        {open ? (
          <div style={{ padding: "10px 12px 12px", display: "grid", gap: 8 }}>
            {folder.files?.map((file) => {
              const type = fileTypeLabel(file);
              const youtubeId = file.external_url ? getYouTubeVideoId(file.external_url) : null;
              return (
                <div key={file.id} style={{ border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, padding: "12px 14px", background: "#fff" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span className={styles.typeBadge}>{type}</span>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{file.title}</div>
                  </div>
                  {youtubeId ? (
                    <div style={{ width: "100%", maxWidth: 480, aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", background: "#000", marginTop: 10 }}>
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
            })}
            {!folder.files?.length && !hasChildren ? (
              <div className={styles.muted} style={{ padding: "4px 2px" }}>No documents in this folder yet.</div>
            ) : null}
          </div>
        ) : null}
      </div>
      {open ? folder.subfolders?.map((sub) => <RepFolderPreview key={sub.id} folder={sub} depth={depth + 1} />) : null}
    </div>
  );
}

export default function DocumentsRepPreview({ folder, onClose }: Props) {
  return (
    <>
      <div role="presentation" className={styles.modalBackdrop} onClick={onClose} />
      <div className={styles.modal} style={{ width: "min(720px, calc(100vw - 32px))", maxHeight: "calc(100vh - 48px)", display: "grid", gridTemplateRows: "auto 1fr" }} data-testid="admin-docs-rep-preview">
        <header className={styles.modalHeader} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Rep preview</div>
            <div className={styles.muted} style={{ marginTop: 4 }}>How reps see “{folder.name}” in Sales Command</div>
          </div>
          <button type="button" className={styles.btnGhost} onClick={onClose}>
            Close
          </button>
        </header>
        <div style={{ padding: 16, overflowY: "auto", background: "#f8fafc" }}>
          <RepFolderPreview folder={folder} depth={0} />
        </div>
      </div>
    </>
  );
}
