"use client";

import React from "react";
import {
  entriesFromDataTransfer,
  entriesFromFileList,
  type DocumentUploadEntry,
} from "@/lib/documents/collectUploadEntries";
import { IconLink, IconUpload } from "./DocumentIcons";
import styles from "./documents.module.css";

type Props = {
  disabled: boolean;
  uploading: boolean;
  onUpload: (items: DocumentUploadEntry[]) => Promise<void>;
};

export default function DocumentsUploadZone({ disabled, uploading, onUpload }: Props) {
  const [dragOver, setDragOver] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkTitle, setLinkTitle] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const folderInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const el = folderInputRef.current;
    if (!el) return;
    el.setAttribute("webkitdirectory", "");
    el.setAttribute("directory", "");
  }, []);

  async function handleFiles(files: FileList | File[]) {
    const list = entriesFromFileList(files);
    if (!list.length) return;
    await onUpload(list);
  }

  async function handleDrop(dataTransfer: DataTransfer) {
    const list = await entriesFromDataTransfer(dataTransfer);
    if (!list.length) return;
    await onUpload(list);
  }

  async function handleAddLink() {
    const url = linkUrl.trim();
    const title = linkTitle.trim() || "Link";
    if (!url) return;
    await onUpload([{ title, externalUrl: url }]);
    setLinkUrl("");
    setLinkTitle("");
  }

  return (
    <div className={styles.uploadPanel} data-testid="admin-docs-upload-zone">
      <div
        className={`${styles.uploadDrop} ${dragOver ? styles.uploadDropActive : ""} ${disabled ? styles.uploadDropDisabled : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled || uploading) return;
          void handleDrop(e.dataTransfer);
        }}
      >
        <IconUpload size={22} stroke={disabled ? "#94a3b8" : "var(--brand-600)"} />
        <div className={styles.uploadCopy}>
          <p className={styles.uploadTitle}>{disabled ? "Open a folder to upload files" : "Upload files or folders"}</p>
          <p className={styles.uploadHint}>
            Drag and drop files or whole folders — nested structure is preserved. You can also choose files or a folder
            from your computer.
          </p>
        </div>
        <div className={styles.uploadActions}>
          <button
            type="button"
            className={styles.btnPrimary}
            disabled={disabled || uploading}
            data-testid="admin-docs-choose-files-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? "Uploading…" : "Choose files"}
          </button>
          <button
            type="button"
            className={styles.btnGhost}
            disabled={disabled || uploading}
            data-testid="admin-docs-choose-folder-btn"
            onClick={() => folderInputRef.current?.click()}
          >
            Choose folder
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          data-testid="admin-docs-file-input"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          data-testid="admin-docs-folder-input"
          onChange={(e) => {
            if (e.target.files?.length) void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className={styles.linkSection}>
        <div className={styles.linkLabel}>
          <IconLink size={14} stroke="#64748b" /> Add external link
        </div>
        <div className={styles.fieldGrid}>
          <input
            className={styles.input}
            placeholder="Display title (optional)"
            value={linkTitle}
            disabled={disabled || uploading}
            data-testid="admin-docs-link-title"
            onChange={(e) => setLinkTitle(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="https://…"
            value={linkUrl}
            disabled={disabled || uploading}
            data-testid="admin-docs-link-url"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleAddLink();
            }}
          />
        </div>
        <button
          type="button"
          className={styles.btnGhost}
          disabled={disabled || uploading || !linkUrl.trim()}
          data-testid="admin-docs-add-link-btn"
          onClick={() => void handleAddLink()}
        >
          Add link
        </button>
      </div>
    </div>
  );
}
