type IdentityRow = {
  id: string;
  provider: string;
  created_at?: string | null;
  last_sign_in_at?: string | null;
};

function providerLabel(p: string): string {
  const u = String(p || "").toLowerCase();
  if (u === "email") return "Email / password";
  if (u === "google") return "Google";
  if (u === "azure") return "Microsoft";
  if (u === "github") return "GitHub";
  if (u === "apple") return "Apple";
  return p || "—";
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return "—";
  }
}

export default function UserIdentitiesBlock({ identities }: { identities: IdentityRow[] }) {
  return (
    <>
      <p style={{ margin: "0 0 12px", fontSize: 13, opacity: 0.8, lineHeight: 1.45 }}>
        Linked providers for this user. OAuth / SSO links are managed in Supabase Auth; removing them here is not supported by the
        API. Users can unlink from their account settings when available, or you can adjust the user in the Supabase dashboard.
      </p>
      {identities.length ? (
        <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.03)", fontSize: 12, opacity: 0.75 }}>
                <th style={{ padding: 10 }}>Method</th>
                <th style={{ padding: 10 }}>Added</th>
                <th style={{ padding: 10 }}>Last sign-in</th>
              </tr>
            </thead>
            <tbody>
              {identities.map((row) => (
                <tr key={row.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <td style={{ padding: 10, fontWeight: 800 }}>{providerLabel(row.provider)}</td>
                  <td style={{ padding: 10 }}>{fmtDate(row.created_at)}</td>
                  <td style={{ padding: 10 }}>{fmtDate(row.last_sign_in_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ fontSize: 13, opacity: 0.7 }}>No linked sign-in methods.</div>
      )}
    </>
  );
}
