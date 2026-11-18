"use client";

import { useState } from "react";

export default function AdditionalInfoClient({ ivrId }: { ivrId: string }) {
  const [message, setMessage] = useState("");
  const [insuranceCard, setInsuranceCard] = useState<File | null>(null);
  const [clinical, setClinical] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setOkMsg(null);
    setErrMsg(null);

    try {
      const fd = new FormData();
      fd.set("message", message);

      if (insuranceCard) fd.set("insurance_card", insuranceCard);
      for (const f of clinical) fd.append("clinical_records", f);

      const res = await fetch(`/api/portal/ivr/${encodeURIComponent(ivrId)}/additional-info`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        setErrMsg(json?.error || `Failed (${res.status})`);
        setSaving(false);
        return;
      }

      setOkMsg("Sent to IVR team. Thanks!");
      setMessage("");
      setInsuranceCard(null);
      setClinical([]);

      setSaving(false);

      // Refresh the page so attachments list updates
      window.location.reload();
    } catch (e: any) {
      setErrMsg(e?.message || "Failed to submit");
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {okMsg ? (
        <div style={{ padding: 10, borderRadius: 10, background: "rgba(0,0,0,0.06)", fontSize: 13 }}>
          {okMsg}
        </div>
      ) : null}

      {errMsg ? (
        <div style={{ padding: 10, borderRadius: 10, background: "rgba(220,0,0,0.08)", color: "crimson", fontSize: 13 }}>
          {errMsg}
        </div>
      ) : null}

      <div>
        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>
          Message to IVR team (optional)
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder="Type any additional details requested by the IVR team..."
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            fontSize: 13,
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>
            Insurance card (optional)
          </div>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setInsuranceCard(e.target.files?.[0] || null)}
          />
        </div>

        <div>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>
            Clinical records (optional, multiple)
          </div>
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={(e) => setClinical(Array.from(e.target.files || []))}
          />
        </div>
      </div>

      <button
        onClick={submit}
        disabled={saving}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.18)",
          background: "#111",
          color: "white",
          fontWeight: 900,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Sending…" : "Send to IVR team"}
      </button>

      <div style={{ fontSize: 12, opacity: 0.7 }}>
        This message is delivered securely; emails do not include patient information.
      </div>
    </div>
  );
}
