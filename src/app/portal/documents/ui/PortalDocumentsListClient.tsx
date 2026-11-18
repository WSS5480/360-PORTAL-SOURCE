"use client";

import React from "react";

type DocFile = {
  id: string;
  folder_id: string;
  title: string | null;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  external_url: string | null;
  created_at: string | null;
};

type DocFolder = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  parent_id?: string | null;
  created_at: string | null;
  documents_files?: DocFile[];
  subfolders?: DocFolder[];
};

function getYouTubeVideoId(url: string | null): string | null {
  if (!url?.trim()) return null;
  const u = url.trim().toLowerCase();
  if (u.includes("youtube.com/watch?v=")) {
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  if (u.includes("youtu.be/")) {
    const m = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  return null;
}

function isYouTubeUrl(url: string | null): boolean {
  return !!getYouTubeVideoId(url);
}

function fileTypeLabel(file: DocFile): string {
  if (file.external_url) {
    const url = (file.external_url || "").toLowerCase();
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "VIDEO";
    return "LINK";
  }
  const content = (file.content_type || "").toLowerCase();
  const filename = (file.filename || "").toLowerCase();
  if (content.includes("pdf") || filename.endsWith(".pdf")) return "PDF";
  const extMatch = filename.match(/\.([a-z0-9]{1,6})$/i);
  if (extMatch) return extMatch[1].toUpperCase();
  if (content.includes("image")) return "IMG";
  if (content.includes("word")) return "DOC";
  if (content.includes("excel") || content.includes("spreadsheet")) return "XLS";
  return "FILE";
}

const styles: Record<string, React.CSSProperties> = {
  folderGrid: { display: "grid", gap: 14 },
  folderCard: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 12%, var(--border))",
    borderRadius: 16,
    padding: 16,
    background: "white",
    boxShadow: "var(--shadow-1)",
    display: "grid",
    gap: 12,
  },
  folderHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
    cursor: "pointer",
    userSelect: "none",
  },
  folderHeaderInner: { display: "flex", alignItems: "center", gap: 10 },
  chevron: { fontSize: 14, fontWeight: 950, color: "var(--muted)", transition: "transform 120ms ease" },
  folderTitle: { fontWeight: 950, fontSize: 16 },
  folderSub: { fontSize: 12, color: "var(--muted)", fontWeight: 700, marginTop: 4 },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 8px",
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background: "color-mix(in srgb, var(--brand-050) 70%, white)",
    fontSize: 11,
    fontWeight: 900,
    color: "var(--brand-700)",
  },
  fileList: { display: "grid", gap: 10 },
  fileRow: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "var(--border)",
    borderRadius: 12,
    padding: "12px 14px",
    display: "grid",
    gap: 12,
    alignItems: "center",
    gridTemplateColumns: "90px minmax(200px, 2fr) auto",
  },
  fileTitle: { fontWeight: 900, fontSize: 13 },
  fileTypePill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    padding: "6px 8px",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 18%, var(--border))",
    background: "color-mix(in srgb, var(--brand-050) 70%, white)",
    fontSize: 11,
    fontWeight: 950,
    color: "var(--brand-700)",
    textTransform: "uppercase",
  },
  videoEmbed: {
    width: "100%",
    maxWidth: 640,
    aspectRatio: "16/9",
    borderRadius: 12,
    overflow: "hidden",
    background: "#000",
  },
  videoEmbedIframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  downloadBtn: {
    padding: "8px 12px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background: "var(--brand-600)",
    color: "white",
    fontWeight: 950,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  empty: { padding: 12, fontSize: 13, color: "var(--muted)" },
  expandRow: { cursor: "pointer", transition: "background 120ms ease" },
  expandRowHover: { background: "color-mix(in srgb, var(--brand-050) 70%, white)" },
  openLink: { fontSize: 12, color: "var(--muted)", fontWeight: 700, marginTop: 8 },
};

function countFolderItems(folder: DocFolder): { files: number; subfolders: number } {
  const files = folder.documents_files?.length ?? 0;
  const subfolders = folder.subfolders?.length ?? 0;
  return { files, subfolders };
}

function YouTubeVideoRow({
  file,
  videoId,
  isExpanded,
  onToggle,
}: {
  file: DocFile;
  videoId: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      style={{
        ...styles.fileRow,
        ...styles.expandRow,
        ...(hover ? styles.expandRowHover : null),
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gridTemplateColumns: undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle()}
        aria-expanded={isExpanded}
      >
        <div style={styles.fileTypePill}>{fileTypeLabel(file)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.fileTitle}>{file.title?.trim() || "Untitled video"}</div>
        </div>
        <span style={{ ...styles.downloadBtn, padding: "6px 10px", fontSize: 12 }}>
          {isExpanded ? "Hide video" : "Watch"}
        </span>
      </div>
      {isExpanded ? (
        <div style={{ marginTop: 12 }}>
          <div style={styles.videoEmbed}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0`}
              title={file.title?.trim() || "Video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={styles.videoEmbedIframe}
            />
          </div>
          <a
            href={file.external_url!}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.openLink}
            onClick={(e) => e.stopPropagation()}
          >
            Open in YouTube ↗
          </a>
        </div>
      ) : null}
    </div>
  );
}

function FileRow({
  file,
  expandedVideoId,
  onToggleVideo,
}: {
  file: DocFile;
  expandedVideoId: string | null;
  onToggleVideo: (id: string) => void;
}) {
  const isYouTube = isYouTubeUrl(file.external_url);
  const videoId = getYouTubeVideoId(file.external_url);
  const isExpanded = expandedVideoId === file.id;

  if (isYouTube && videoId) {
    return (
      <YouTubeVideoRow
        file={file}
        videoId={videoId}
        isExpanded={isExpanded}
        onToggle={() => onToggleVideo(file.id)}
      />
    );
  }

  const isLink = !!file.external_url;
  const href = isLink ? file.external_url! : `/api/portal/documents/files/${file.id}/download`;
  const label = isLink ? "Open link" : "Download";

  return (
    <div style={styles.fileRow}>
      <div style={styles.fileTypePill}>{fileTypeLabel(file)}</div>
      <div>
        <div style={styles.fileTitle}>{file.title?.trim() || "Untitled document"}</div>
      </div>
      <a
        href={href}
        target={isLink ? "_blank" : undefined}
        rel={isLink ? "noopener noreferrer" : undefined}
        style={styles.downloadBtn}
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </a>
    </div>
  );
}

function FolderCard({
  folder,
  depth,
  expandedFolders,
  onToggle,
  expandedVideoId,
  onToggleVideo,
}: {
  folder: DocFolder;
  depth: number;
  expandedFolders: Record<string, boolean>;
  onToggle: (id: string) => void;
  expandedVideoId: string | null;
  onToggleVideo: (id: string) => void;
}) {
  const files = Array.isArray(folder.documents_files) ? folder.documents_files : [];
  const subfolders = Array.isArray(folder.subfolders) ? folder.subfolders : [];
  const isExpanded = expandedFolders[folder.id] === true;
  const { files: fileCount, subfolders: subCount } = countFolderItems(folder);
  const itemCount = fileCount + subCount;

  return (
    <div
      key={folder.id}
      style={{
        ...styles.folderCard,
        marginLeft: depth > 0 ? 24 : 0,
        borderLeft: depth > 0 ? "3px solid color-mix(in srgb, var(--brand-600) 20%, var(--border))" : undefined,
      }}
    >
      <div
        style={styles.folderHeader}
        onClick={() => onToggle(folder.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && onToggle(folder.id)}
        aria-expanded={isExpanded}
      >
        <div style={styles.folderHeaderInner}>
          <span
            style={{ ...styles.chevron, transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
            aria-hidden
          >
            ▾
          </span>
          <div>
            <div style={styles.folderTitle}>{folder.name}</div>
            <div style={styles.folderSub}>
              {folder.description || "No description"}
              {!isExpanded && itemCount > 0 ? ` • ${subCount} subfolder${subCount !== 1 ? "s" : ""}, ${fileCount} file${fileCount !== 1 ? "s" : ""}` : ""}
            </div>
          </div>
        </div>
        <span style={styles.pill}>{itemCount} item{itemCount !== 1 ? "s" : ""}</span>
      </div>

      {isExpanded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {subfolders.map((sub) => (
            <FolderCard
              key={sub.id}
              folder={sub}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              expandedVideoId={expandedVideoId}
              onToggleVideo={onToggleVideo}
            />
          ))}
          {files.length === 0 && subfolders.length === 0 ? (
            <div style={styles.empty}>No files uploaded yet.</div>
          ) : files.length > 0 ? (
            <div style={styles.fileList}>
              {files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  expandedVideoId={expandedVideoId}
                  onToggleVideo={onToggleVideo}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function PortalDocumentsListClient({ folders }: { folders: DocFolder[] }) {
  const [expandedFolders, setExpandedFolders] = React.useState<Record<string, boolean>>({});
  const [expandedVideoId, setExpandedVideoId] = React.useState<string | null>(null);
  const onToggle = React.useCallback((id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const onToggleVideo = React.useCallback((id: string) => {
    setExpandedVideoId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div style={styles.folderGrid}>
      {folders.map((folder) => (
        <FolderCard
          key={folder.id}
          folder={folder}
          depth={0}
          expandedFolders={expandedFolders}
          onToggle={onToggle}
          expandedVideoId={expandedVideoId}
          onToggleVideo={onToggleVideo}
        />
      ))}
    </div>
  );
}
