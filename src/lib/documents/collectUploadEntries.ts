export type DocumentUploadEntry = {
  title: string;
  file?: File;
  externalUrl?: string;
  /** Relative path within the dropped/selected folder, e.g. "Playbooks/PDFs/sheet.pdf" */
  relativePath?: string;
};

type FileSystemEntryLike = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
};

type FileSystemFileEntryLike = FileSystemEntryLike & {
  file: (success: (file: File) => void, error?: (err: DOMException) => void) => void;
};

type FileSystemDirectoryReaderLike = {
  readEntries: (
    success: (entries: FileSystemEntryLike[]) => void,
    error?: (err: DOMException) => void,
  ) => void;
};

type FileSystemDirectoryEntryLike = FileSystemEntryLike & {
  createReader: () => FileSystemDirectoryReaderLike;
};

const JUNK_NAMES = new Set([".ds_store", "thumbs.db", "desktop.ini", ".gitkeep"]);

export function normalizeRelativePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

export function splitRelativePath(relativePath: string): { folderSegments: string[]; fileName: string } {
  const parts = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  if (parts.length <= 1) return { folderSegments: [], fileName: parts[0] || "" };
  return { folderSegments: parts.slice(0, -1), fileName: parts[parts.length - 1] || "" };
}

function isJunkPath(relativePath: string): boolean {
  const parts = normalizeRelativePath(relativePath).split("/").filter(Boolean);
  if (!parts.length) return true;
  if (parts.some((part) => part === "__MACOSX" || part.startsWith("._"))) return true;
  const fileName = parts[parts.length - 1]?.toLowerCase() ?? "";
  return JUNK_NAMES.has(fileName);
}

function titleFromPath(relativePath: string, fallbackName: string): string {
  const { fileName } = splitRelativePath(relativePath || fallbackName);
  const base = (fileName || fallbackName).replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || fileName || fallbackName || "Document";
}

export function entriesFromFileList(files: FileList | File[]): DocumentUploadEntry[] {
  const out: DocumentUploadEntry[] = [];
  for (const file of Array.from(files)) {
    const relativePath = normalizeRelativePath(file.webkitRelativePath || file.name);
    if (isJunkPath(relativePath)) continue;
    out.push({
      title: titleFromPath(relativePath, file.name),
      file,
      relativePath,
    });
  }
  return out;
}

function readAllDirectoryEntries(reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    const all: FileSystemEntryLike[] = [];
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (!batch.length) {
            resolve(all);
            return;
          }
          all.push(...batch);
          readBatch();
        },
        (err) => reject(err),
      );
    };
    readBatch();
  });
}

function readFileEntry(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

async function walkEntry(entry: FileSystemEntryLike, parentPath: string, out: DocumentUploadEntry[]): Promise<void> {
  const relativePath = normalizeRelativePath(parentPath ? `${parentPath}/${entry.name}` : entry.name);
  if (isJunkPath(relativePath)) return;

  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntryLike);
    out.push({
      title: titleFromPath(relativePath, file.name),
      file,
      relativePath,
    });
    return;
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntryLike).createReader();
    const children = await readAllDirectoryEntries(reader);
    if (!children.length) {
      // Preserve empty folders by recording a directory marker (no file).
      out.push({ title: entry.name, relativePath: `${relativePath}/` });
      return;
    }
    for (const child of children) {
      await walkEntry(child, relativePath, out);
    }
  }
}

export async function entriesFromDataTransfer(dataTransfer: DataTransfer): Promise<DocumentUploadEntry[]> {
  const items = dataTransfer.items;
  if (items?.length) {
    const rootEntries: FileSystemEntryLike[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const entry =
        typeof item.webkitGetAsEntry === "function"
          ? (item.webkitGetAsEntry() as FileSystemEntryLike | null)
          : null;
      if (entry) rootEntries.push(entry);
    }

    if (rootEntries.length) {
      const out: DocumentUploadEntry[] = [];
      for (const entry of rootEntries) {
        await walkEntry(entry, "", out);
      }
      if (out.length) return out;
    }
  }

  return entriesFromFileList(dataTransfer.files);
}

/** Unique folder paths that must exist before files are uploaded. */
export function collectFolderPathsToEnsure(entries: DocumentUploadEntry[]): string[] {
  const paths = new Set<string>();
  for (const entry of entries) {
    const relativePath = normalizeRelativePath(entry.relativePath || "");
    if (!relativePath) continue;

    if (relativePath.endsWith("/")) {
      paths.add(relativePath.replace(/\/+$/, ""));
      continue;
    }

    const { folderSegments } = splitRelativePath(relativePath);
    for (let i = 1; i <= folderSegments.length; i++) {
      paths.add(folderSegments.slice(0, i).join("/"));
    }
  }

  return [...paths].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b));
}
