"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PartnerSummary = {
  id: string;
  code: string;
  name: string;
  environment: string;
  status: string;
  callback_base_url: string | null;
};

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 16,
  background: "white",
  padding: 16,
  display: "grid",
  gap: 12,
};

const input: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.16)",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 14,
};

const button: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.16)",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 800,
  background: "white",
  cursor: "pointer",
};

async function postJson(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function CreatePartnerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      style={card}
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setPending(true);
        const form = new FormData(event.currentTarget);
        const result = await postJson("/api/admin/integrations/partners", "POST", {
          code: String(form.get("code") || ""),
          name: String(form.get("name") || ""),
          environment: String(form.get("environment") || "sandbox"),
          callback_base_url: String(form.get("callback_base_url") || ""),
        });
        setPending(false);
        if (!result.ok) {
          setError(result.json?.error || "The partner could not be created.");
          return;
        }
        event.currentTarget.reset();
        router.push(`/admin/integrations/${result.json.partner.id}`);
        router.refresh();
      }}
    >
      <div style={{ fontWeight: 900 }}>New partner</div>
      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <input name="name" required placeholder="Display name" style={input} />
        <input name="code" required placeholder="code-name" style={input} />
        <select name="environment" defaultValue="sandbox" style={input}>
          <option value="sandbox">Sandbox</option>
          <option value="production">Production</option>
        </select>
        <input name="callback_base_url" placeholder="https://callback.example" style={input} />
      </div>
      <div style={{ fontSize: 13, opacity: 0.75 }}>
        Production partners stay inactive. Production API keys cannot be issued in this release.
      </div>
      {error ? <div style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</div> : null}
      <button type="submit" disabled={pending} style={button}>
        {pending ? "Saving…" : "Create partner"}
      </button>
    </form>
  );
}

export function PartnerSummaryTable({ partners }: { partners: PartnerSummary[] }) {
  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <div style={{ fontWeight: 900 }}>Partner organizations</div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Code</th>
            <th style={{ padding: 8 }}>Environment</th>
            <th style={{ padding: 8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {partners.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: 8, opacity: 0.7 }}>
                No partners yet.
              </td>
            </tr>
          ) : (
            partners.map((partner) => (
              <tr key={partner.id} style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <td style={{ padding: 8 }}>
                  <a href={`/admin/integrations/${partner.id}`} style={{ fontWeight: 800, color: "var(--brand-700)" }}>
                    {partner.name}
                  </a>
                </td>
                <td style={{ padding: 8 }}>{partner.code}</td>
                <td style={{ padding: 8 }}>{partner.environment}</td>
                <td style={{ padding: 8 }}>{partner.status}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PartnerControls({
  partner,
  accounts,
}: {
  partner: PartnerSummary;
  accounts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const production = partner.environment === "production";

  async function setStatus(status: "active" | "inactive" | "disabled") {
    setError(null);
    setPending(true);
    const result = await postJson(`/api/admin/integrations/partners/${partner.id}`, "PATCH", { status });
    setPending(false);
    if (!result.ok) {
      setError(result.json?.error || "The partner could not be updated.");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={card}>
        <div style={{ fontWeight: 900 }}>Connection</div>
        <div style={{ fontSize: 14 }}>
          {partner.name} · {partner.code} · {partner.environment} · {partner.status}
        </div>
        {production ? (
          <div style={{ fontSize: 14, color: "#9a3412" }}>
            Production credentials cannot be activated. This partner can be configured, and it cannot authenticate.
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={button} disabled={pending || partner.status === "active"} onClick={() => setStatus("active")}>
              Mark active
            </button>
            <button type="button" style={button} disabled={pending || partner.status === "inactive"} onClick={() => setStatus("inactive")}>
              Mark inactive
            </button>
            <button type="button" style={button} disabled={pending || partner.status === "disabled"} onClick={() => setStatus("disabled")}>
              Disable
            </button>
          </div>
        )}
        {error ? <div style={{ color: "#b91c1c", fontWeight: 800 }}>{error}</div> : null}
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900 }}>Issue inbound API key</div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          The secret is shown once. Stored credentials keep only a prefix and a hash. Scopes are orders:read and orders:write.
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setSecret(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            const result = await postJson(`/api/admin/integrations/partners/${partner.id}/credentials`, "POST", {
              name: String(form.get("name") || ""),
            });
            setPending(false);
            if (!result.ok) {
              setError(result.json?.error || "The credential could not be created.");
              return;
            }
            setSecret(String(result.json.secret || ""));
            event.currentTarget.reset();
            router.refresh();
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input name="name" required placeholder="Key name" style={input} disabled={production} />
          <button type="submit" style={button} disabled={pending || production}>
            Issue sandbox key
          </button>
        </form>
        {secret ? (
          <div style={{ background: "#fff7ed", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Copy this key now. It will not be shown again.</div>
            <code style={{ wordBreak: "break-all" }}>{secret}</code>
          </div>
        ) : null}
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900 }}>Save outbound callback token</div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          The partner-issued bearer token is encrypted before it is stored. It is not shown again and is not written to request logs.
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            const result = await postJson(`/api/admin/integrations/partners/${partner.id}/outbound-credential`, "POST", {
              name: String(form.get("outbound_name") || ""),
              token: String(form.get("outbound_token") || ""),
            });
            setPending(false);
            if (!result.ok) {
              setError(result.json?.error || "The outbound credential could not be saved.");
              return;
            }
            event.currentTarget.reset();
            router.refresh();
          }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <input name="outbound_name" required placeholder="Token name" style={input} disabled={production} />
          <input name="outbound_token" required type="password" placeholder="Bearer token" style={input} disabled={production} autoComplete="off" />
          <button type="submit" style={button} disabled={pending || production}>
            Save sandbox token
          </button>
        </form>
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900 }}>Map an external account</div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setPending(true);
            const form = new FormData(event.currentTarget);
            const result = await postJson(`/api/admin/integrations/partners/${partner.id}/accounts`, "POST", {
              partner_account_ref: String(form.get("partner_account_ref") || ""),
              account_id: String(form.get("account_id") || ""),
            });
            setPending(false);
            if (!result.ok) {
              setError(result.json?.error || "The mapping could not be saved.");
              return;
            }
            event.currentTarget.reset();
            router.refresh();
          }}
          style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
        >
          <input name="partner_account_ref" required placeholder="External account ref" style={input} />
          <select name="account_id" required defaultValue="" style={input}>
            <option value="" disabled>
              360 account
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <button type="submit" style={button} disabled={pending}>
            Save mapping
          </button>
        </form>
      </section>
    </div>
  );
}

export function RevokeCredentialButton({ partnerId, credentialId }: { partnerId: string; credentialId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      style={button}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await postJson(`/api/admin/integrations/partners/${partnerId}/credentials/${credentialId}/revoke`, "POST");
        setPending(false);
        router.refresh();
      }}
    >
      Revoke
    </button>
  );
}

export function RemoveMappingButton({ partnerId, mappingId }: { partnerId: string; mappingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      style={button}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch(`/api/admin/integrations/partners/${partnerId}/accounts/${mappingId}`, { method: "DELETE" });
        setPending(false);
        router.refresh();
      }}
    >
      Remove
    </button>
  );
}

export function RetrySyncButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-grid", gap: 4 }}>
      <button
        type="button"
        style={button}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const result = await postJson(`/api/admin/integrations/jobs/${jobId}/retry`, "POST");
          setPending(false);
          if (!result.ok) {
            setError(result.json?.error || "Retry failed.");
            return;
          }
          router.refresh();
        }}
      >
        Retry
      </button>
      {error ? <span style={{ color: "#b91c1c", fontSize: 12 }}>{error}</span> : null}
    </span>
  );
}
