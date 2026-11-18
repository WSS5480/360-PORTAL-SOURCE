import Link from "next/link";
import { requireCurrentAccount } from "@/lib/portal/requireCurrentAccount";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { canViewOrders } from "@/lib/portal/portalRoles";
import PortalDocumentsListClient from "./ui/PortalDocumentsListClient";

export const dynamic = "force-dynamic";

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

function buildFolderTree(flat: DocFolder[]): DocFolder[] {
  const byParent = new Map<string | null, DocFolder[]>();
  for (const f of flat) {
    const pid = f.parent_id ?? null;
    if (!byParent.has(pid)) byParent.set(pid, []);
    byParent.get(pid)!.push(f);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }
  function attachChildren(folder: DocFolder): DocFolder {
    const children = byParent.get(folder.id) ?? [];
    return {
      ...folder,
      subfolders: children.map(attachChildren),
    };
  }
  const roots = byParent.get(null) ?? [];
  return roots.map(attachChildren);
}

export default async function PortalDocumentsPage() {
  const ctx = await requireCurrentAccount();
  const accountId = ctx.currentAccountId;

  if (!accountId) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>No account selected.</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>Please select an account to continue.</div>
      </div>
    );
  }

  if (!canViewOrders(ctx.currentRole)) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ color: "crimson", fontWeight: 950 }}>Forbidden</div>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.8 }}>
          Your role does not have permission to view documents for this account.
        </div>
      </div>
    );
  }

  const supabase = createSupabaseAdminClient();

  // Fetch all folders (visibility filtered below by share_mode + account)
  const { data: allFolders, error } = await supabase
    .from("documents_folders")
    .select(
      `
      id,
      name,
      description,
      sort_order,
      parent_id,
      account_id,
      share_mode,
      created_at,
      documents_files (
        id,
        folder_id,
        title,
        filename,
        content_type,
        size_bytes,
        external_url,
        created_at
      )
    `
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return <pre style={{ color: "crimson" }}>Unable to load documents.</pre>;

  // Folders visible to portal: share_mode="all" OR (share_mode="selected" AND account has access)
  const { data: folderAccountRows } = await supabase
    .from("documents_folder_accounts")
    .select("folder_id")
    .eq("account_id", accountId);

  const allowedFolderIds = new Set((folderAccountRows ?? []).map((r: { folder_id: string }) => r.folder_id));

  const filtered = (Array.isArray(allFolders) ? allFolders : []).filter((folder: any) => {
    if (folder?.share_mode === "all") return true;
    if (folder?.share_mode !== "selected") return false; // admin_only = not visible in portal
    if (folder?.account_id === accountId) return true;
    if (allowedFolderIds.has(folder?.id)) return true;
    return false;
  });

  const flat: DocFolder[] = (filtered as DocFolder[]).map((f) => {
    const files = Array.isArray(f.documents_files) ? f.documents_files : [];
    files.sort((a, b) => {
      const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return { ...f, documents_files: files };
  });
  const folderTree = buildFolderTree(flat);
  const totalFolders = flat.length;
  const totalFiles = flat.reduce((acc, f) => acc + (f.documents_files?.length ?? 0), 0);

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.heroTop}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.heroKicker}>360 Portal</div>
            <h1 style={styles.heroTitle}>Documents</h1>
            <p style={styles.heroSub}>
              Access shared documents for <span style={styles.heroAccountName}>{ctx.currentAccountName ?? "your account"}</span>.
            </p>
          </div>

          <div style={styles.heroRight}>
            <Link href="/portal/invoices" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              Invoices
            </Link>
            <Link href="/portal/orders" style={{ ...styles.ghostBtn, textDecoration: "none" }}>
              Orders
            </Link>
          </div>
        </div>

        <div className="portal-hero-stats" style={styles.heroStatsRow}>
          <Stat label="Folders" value={totalFolders} />
          <Stat label="Files" value={totalFiles} />
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>All documents</h2>
          <div style={styles.sectionMeta}>Browse by folder and download files as needed.</div>
        </div>

        {folderTree.length === 0 ? <div style={styles.empty}>No documents available yet.</div> : null}

        <PortalDocumentsListClient folders={folderTree} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={styles.heroStat}>
      <div style={styles.heroStatLabel}>{label}</div>
      <div style={styles.heroStatValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", gap: 22 },
  hero: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in srgb, var(--brand-600) 16%, var(--border))",
    background:
      "radial-gradient(900px 240px at 20% 10%, color-mix(in srgb, var(--brand-600) 42%, transparent), transparent 60%)," +
      "linear-gradient(180deg, #061225, #050b16)",
    boxShadow: "var(--shadow-1)",
  },
  heroTop: {
    padding: 18,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  heroKicker: {
    color: "rgba(255,255,255,0.70)",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 950,
    margin: "6px 0 0",
    letterSpacing: -0.3,
    color: "white",
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.78)",
    lineHeight: 1.45,
    maxWidth: 860,
  },
  heroAccountName: { fontWeight: 950, color: "white" },
  heroRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  ghostBtn: {
    padding: "10px 14px",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.92)",
    fontWeight: 950,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    whiteSpace: "nowrap",
  },
  heroStatsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 0,
    borderTop: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.03)",
    paddingRight: 10,
    boxSizing: "border-box",
  },
  heroStat: {
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
    borderRight: "1px solid rgba(255,255,255,0.10)",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroStatValue: { color: "white", fontWeight: 950, fontSize: 20 },
  section: { display: "flex", flexDirection: "column", gap: 14 },
  sectionHeader: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  sectionTitle: { fontSize: 18, fontWeight: 950, margin: 0 },
  sectionMeta: { fontSize: 13, color: "var(--muted)" },
  empty: { padding: 12, fontSize: 13, color: "var(--muted)" },
};
