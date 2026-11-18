import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { formatRoleLabel } from "@/lib/formatStatusLabel";

export const dynamic = "force-dynamic";

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return String(s);
  return d.toLocaleString();
}

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(0,0,0,0.12)",
    borderRadius: 12,
    background: "white",
    overflow: "hidden",
  };
}
function header(title: string): React.ReactNode {
  return (
    <div style={{ padding: 12, borderBottom: "1px solid rgba(0,0,0,0.08)", fontWeight: 900 }}>
      {title}
    </div>
  );
}
function btn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "#111",
    color: "white",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
  };
}
function btnGhost(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(0,0,0,0.15)",
    background: "white",
    color: "#111",
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
  };
}
function pill(kind: "ok" | "err") {
  return {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    fontSize: 13,
    background: kind === "ok" ? "rgba(0,0,0,0.06)" : "rgba(220,0,0,0.08)",
    color: kind === "ok" ? "#111" : "crimson",
  } as React.CSSProperties;
}

const ROLE_OPTIONS = [
  // ⚠️ You MUST align these with your actual enum values.
  // If your enum is different, change these strings.
  "MEMBER",
  "ADMIN",
] as const;

export default async function AdminAccountPeoplePage(props: {
  params: Promise<{ accountId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { accountId } = await props.params;

  const sp = props.searchParams ? await props.searchParams : {};
  const flash = typeof (sp as any)?.flash === "string" ? String((sp as any).flash) : "";
  const err = typeof (sp as any)?.err === "string" ? String((sp as any).err) : "";

  // Server fetch to admin API
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "";
  const url = base
    ? `${base}/api/admin/accounts/${encodeURIComponent(accountId)}/people`
    : `/api/admin/accounts/${encodeURIComponent(accountId)}/people`;

  const res = await fetch(url, { cache: "no-store" }).catch(() => null);
  const json = res ? await res.json().catch(() => null) : null;

  const contacts = (json?.contacts ?? []) as any[];
  const portalMembers = (json?.portalMembers ?? []) as any[];

  return (
    <main style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>People</h1>
          <p style={{ marginTop: 6, opacity: 0.8, fontSize: 13 }}>
            Saved recipients (from intake) + portal members (logins).
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href={`/admin/accounts/${accountId}`} style={btnGhost()}>
            ← Back to Account
          </Link>
          <Link href={`/admin/ivr/intake?account_id=${encodeURIComponent(accountId)}`} style={btnGhost()}>
            Create IVR Intake →
          </Link>
        </div>
      </div>

      {flash ? <div style={pill("ok")}>{flash}</div> : null}
      {err ? <div style={pill("err")}>{err}</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {/* Saved recipients */}
        <div style={card()}>
          {header("Saved Recipients (created in IVR intake)")}
          <div style={{ padding: 12 }}>
            {contacts.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No saved recipients yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Name</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Email</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Created</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>IVRs tied</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Invite</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c: any) => (
                    <tr key={c.id}>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13, fontWeight: 800 }}>
                        {c.full_name || "—"}{" "}
                        {c.is_primary ? <span style={{ fontSize: 12, opacity: 0.65 }}>· primary</span> : null}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {c.email}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {fmtDateTime(c.created_at)}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <b>{c.ivr_count ?? 0}</b>
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <form
                          method="post"
                          action={`/admin/accounts/${encodeURIComponent(accountId)}/people/invite`}
                          style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
                        >
                          <input type="hidden" name="contact_id" value={c.id} />
                          <select name="role" defaultValue={ROLE_OPTIONS[0]} style={{ padding: "8px 10px", borderRadius: 10 }}>
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          <button type="submit" style={btn()}>
                            Send Invite
                          </button>
                        </form>

                        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.7 }}>
                          (Role options must match your enum.)
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Portal members */}
        <div style={card()}>
          {header("Portal Members (logins)")}
          <div style={{ padding: 12 }}>
            {portalMembers.length === 0 ? (
              <div style={{ opacity: 0.75 }}>No portal members yet.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Name</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Email</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Role</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>Created</th>
                    <th style={{ textAlign: "left", padding: 10, fontSize: 12 }}>IVRs submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {portalMembers.map((m: any) => (
                    <tr key={m.user_id}>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13, fontWeight: 800 }}>
                        {m.display_name || "Portal User"}{" "}
                        {m.disabled_at ? <span style={{ fontSize: 12, opacity: 0.65 }}>· disabled</span> : null}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {m.email || "—"}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {formatRoleLabel(m.role) || "—"}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        {fmtDateTime(m.created_at)}
                      </td>
                      <td style={{ padding: 10, borderTop: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                        <b>{m.ivr_submitted_count ?? 0}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
