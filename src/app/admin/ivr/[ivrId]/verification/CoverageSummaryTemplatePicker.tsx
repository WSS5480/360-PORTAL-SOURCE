// src/app/admin/ivr/[ivrId]/verification/CoverageSummaryTemplatePicker.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type TemplateRow = {
  id: string;
  name: string;
  body: string;
};

function renderTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = vars[key];
    return typeof v === "string" ? v : "";
  });
}

function readFormValue(form: HTMLFormElement | null, name: string): string {
  if (!form) return "";
  const el = form.elements.namedItem(name) as any;
  if (!el) return "";
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    return String(el.value || "");
  }
  // NodeList case
  if (typeof el?.length === "number" && el[0]?.value != null) return String(el[0].value || "");
  return "";
}

export default function CoverageSummaryTemplatePicker(props: {
  textareaName: string;
  defaultValue: string;
  initialVars: Record<string, string>;
}) {
  const { textareaName, defaultValue, initialVars } = props;

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/ivr/templates", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.ok && Array.isArray(json?.rows)) setTemplates(json.rows);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selected = useMemo(() => templates.find((t) => t.id === selectedId) || null, [templates, selectedId]);

  function buildVars(): Record<string, string> {
    const ta = textareaRef.current;
    const form = ta?.form || null;

    // Pull “live” values from the current form, fallback to initialVars.
    const vars: Record<string, string> = { ...initialVars };

    vars.product = readFormValue(form, "product") || vars.product;
    vars.qcode = readFormValue(form, "qcode") || vars.qcode;
    vars.units_cm2 = readFormValue(form, "units_cm2") || vars.units_cm2;

    vars.primary_insurance = readFormValue(form, "primary_insurance") || vars.primary_insurance;
    vars.secondary_insurance = readFormValue(form, "secondary_insurance") || vars.secondary_insurance;

    vars.cpt_codes = readFormValue(form, "cpt_codes") || vars.cpt_codes;
    vars.icd10_codes = readFormValue(form, "icd10_codes") || vars.icd10_codes;

    vars.place_of_service = readFormValue(form, "place_of_service") || vars.place_of_service;
    vars.dos = readFormValue(form, "dos") || vars.dos;

    vars.good_through = readFormValue(form, "good_through") || vars.good_through;
    vars.rerun_on = readFormValue(form, "rerun_on") || vars.rerun_on;

    vars.medigap_line = readFormValue(form, "medigap_line") || "";

    // optional numeric lines if you add fields later:
    vars.primary_payer_covers_percent = readFormValue(form, "primary_payer_covers_percent") || "";
    vars.patient_coinsurance_percent = readFormValue(form, "patient_coinsurance_percent") || "";

    return vars;
  }

  function onInsert() {
    if (!selected || !textareaRef.current) return;

    const vars = buildVars();
    const rendered = renderTemplate(selected.body, vars);

    // Replace textarea fully (simple + fastest). If you prefer “append”, change this.
    textareaRef.current.value = rendered;

    // trigger native change for any form libs (safe even if you don’t use one)
    textareaRef.current.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>Template</div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 10px",
              borderRadius: 8,
              border: "1px solid rgba(0,0,0,0.2)",
              fontSize: 14,
              background: "var(--surface)",
            }}
          >
            <option value="">{loading ? "Loading templates..." : "Select a template…"}</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={onInsert}
          disabled={!selected}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.2)",
            background: selected ? "#111" : "rgba(0,0,0,0.08)",
            color: selected ? "white" : "rgba(0,0,0,0.5)",
            fontWeight: 900,
            cursor: selected ? "pointer" : "not-allowed",
            height: 42,
            marginTop: 18,
          }}
        >
          Insert template
        </button>

        <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900, marginTop: 18 }}>
          Uses live values from this form (product/qcode/dates) at insert time.
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <textarea
          ref={textareaRef}
          name={textareaName}
          defaultValue={defaultValue}
          rows={6}
          style={{
            width: "100%",
            padding: "10px 10px",
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.2)",
            fontSize: 14,
            background: "var(--surface)",
            resize: "vertical",
          }}
        />
      </div>

      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
        Tokens supported: <b>{"{{product}}"}</b>, <b>{"{{qcode}}"}</b>, <b>{"{{good_through}}"}</b>,{" "}
        <b>{"{{rerun_on}}"}</b>, <b>{"{{primary_insurance}}"}</b>, <b>{"{{medigap_line}}"}</b>, etc.
      </div>
    </div>
  );
}
