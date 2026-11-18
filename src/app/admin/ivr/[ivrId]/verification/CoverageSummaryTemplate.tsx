"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Template = {
  id: string;
  label: string;
  body: string;
};

function normalizeNewlines(s: string) {
  return (s || "").replace(/\r\n/g, "\n");
}

function interpolate(tpl: string, vars: Record<string, string>) {
  // {{token}} replacement
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

function isoToMDY(iso: string): string {
  const s = String(iso || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  const [, y, mm, dd] = m;
  return `${Number(mm)}/${Number(dd)}/${y}`;
}

function getClosestForm(el: HTMLElement | null): HTMLFormElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (cur.tagName === "FORM") return cur as HTMLFormElement;
    cur = cur.parentElement;
  }
  return null;
}

function readFirstNamedValue(form: HTMLFormElement, names: string[]): string {
  for (const name of names) {
    // match input/select/textarea by name
    const el = form.querySelector(`[name="${CSS.escape(name)}"]`) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;

    if (!el) continue;

    // handle checkbox/radio
    if (el instanceof HTMLInputElement) {
      if (el.type === "checkbox") return el.checked ? "true" : "false";
      if (el.type === "radio") {
        const checked = form.querySelector(
          `input[type="radio"][name="${CSS.escape(name)}"]:checked`
        ) as HTMLInputElement | null;
        return checked?.value?.trim() || "";
      }
    }

    const v = (el as any).value;
    const s = typeof v === "string" ? v.trim() : String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function defaultBuiltInTemplates(): Template[] {
  return [
    { id: "none", label: "— Select a template —", body: "" },
    {
      id: "80_20_covered",
      label: "80/20_COVERED",
      body: `The above mentioned skin substitute and application codes (CPT 15271-15278) are valid and eligible with primary payer and does not require prior authorization. Patient's primary payer is Medicare. Medicare covers Q4275 at 80% of the allowed amount leaving patient responsible for 20% co-insurance.

Patient Please note: The benefits provided are in-network benefits. Please confirm your network status as out-of-network benefits may be different. The information provided is for informational purposes only and is not a guarantee of payment or coverage. Coverage should be confirmed directly with the payer and all policy guidelines must be followed. Diagnoses should always reflect the patient’s condition.

Coverage information listed above is open to any skin substitute on the market.`,
    },
    {
      id: "80_0_covered",
      label: "80/0_COVERED",
      body: `The above mentioned skin substitute and application codes (CPT 15271-15278) are valid and eligible with primary payer and does not require prior authorization. Patient's primary payer is Medicare. Medicare covers Q4275 at 80% of the allowed amount leaving patient responsible for 0% co-insurance. The patient is a QMB Beneficiary and payment is considered in full.
Please note: The benefits provided are in-network benefits. Please confirm your network status as out-of-network benefits may be different. The information provided is for informational purposes only and is not a guarantee of payment or coverage. Coverage should be confirmed directly with the payer and all policy guidelines must be followed. Diagnoses should always reflect the patient's condition.
Coverage information listed above is open to any skin substitute on the market.`,
    },
    {
      id: "80_0_covered_hospice",
      label: "80/0_COVERED_HOSPICE",
      body: `The above mentioned skin substitute and application codes (CPT 15271-15278) are valid and eligible with primary payer and does not require prior authorization. Patient's primary payer is Medicare. Medicare covers Q4275 at 80% of the allowed amount leaving patient responsible for 0% co-insurance. Please bill GW modifier to reflect appropriate level of care. Payment is considered in full.
Please note: The benefits provided are in-network benefits. Please confirm your network status as out-of-network benefits may be different. The information provided is for informational purposes only and is not a guarantee of payment or coverage. Coverage should be confirmed directly with the payer and all policy guidelines must be followed. Diagnoses should always reflect the patient's condition.
Coverage information listed above is open to any skin substitute on the market.`,
    },
    {
      id: "not_covered",
      label: "Not Covered",
      body: `The above mentioned skin substitute and application codes are not valid and eligible with patient's primary payer. Payer has a internal policy that excludes the use of said product and claim payment will deny.`,
    },
  ];
}

export default function CoverageSummaryTemplate(props: {
  name: string; // field name: "coverage_summary"
  defaultValue: string;
  rows?: number;
  style?: React.CSSProperties;

  // Fallback/default vars (server-provided is fine)
  vars?: Record<string, string>;

  // Optional: if you later fetch templates from DB on the server page, pass them in here.
  templates?: Template[];
}) {
  const { name, defaultValue, rows = 6, style, vars = {}, templates: templatesProp } = props;

  const templates: Template[] = useMemo(() => {
    const base = templatesProp?.length ? templatesProp : defaultBuiltInTemplates();
    // ensure "none" exists as first option
    if (base[0]?.id === "none") return base;
    return [{ id: "none", label: "— Select a template —", body: "" }, ...base];
  }, [templatesProp]);

  const [selectedId, setSelectedId] = useState("none");
  const [text, setText] = useState(normalizeNewlines(defaultValue));

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const selected = templates.find((t) => t.id === selectedId) || templates[0];

  // Auto-populate when user selects a template (not "none")
  useEffect(() => {
    if (selectedId && selectedId !== "none" && selected?.body) {
      // Defer to next tick so form fields are available
      const t = setTimeout(() => {
        const form = getClosestForm(textareaRef.current);
        const liveVars = form
          ? (() => {
              const product = readFirstNamedValue(form, ["product"]) || vars.product_name || vars.product || "";
              const qcode = readFirstNamedValue(form, ["qcode"]) || vars.qcode || "";
              const goodThroughISO = readFirstNamedValue(form, ["good_through"]) || "";
              const rerunOnISO = readFirstNamedValue(form, ["rerun_on"]) || "";
              return {
                ...vars,
                product_name: product,
                product,
                qcode,
                units_cm2: readFirstNamedValue(form, ["units_cm2"]) || vars.units_cm2 || "",
                good_through: goodThroughISO ? isoToMDY(goodThroughISO) : vars.good_through || "",
                rerun_on: rerunOnISO ? isoToMDY(rerunOnISO) : vars.rerun_on || "",
              };
            })()
          : { ...vars };
        const rendered = interpolate(normalizeNewlines(selected.body), liveVars).trim();
        if (rendered) setText(rendered);
      }, 0);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.body]);

  function gatherLiveVars(): Record<string, string> {
    const form = getClosestForm(textareaRef.current);
    if (!form) return { ...vars };

    // Read live values from the form first; fallback to vars prop
    const product = readFirstNamedValue(form, ["product"]) || vars.product_name || vars.product || "";
    const qcode = readFirstNamedValue(form, ["qcode"]) || vars.qcode || "";
    const units = readFirstNamedValue(form, ["units_cm2"]) || vars.units_cm2 || "";

    const primaryIns = readFirstNamedValue(form, ["primary_insurance", "p_name"]) || vars.primary_insurance || "";
    const secondaryIns = readFirstNamedValue(form, ["secondary_insurance", "s_name"]) || vars.secondary_insurance || "";

    const goodThroughISO = readFirstNamedValue(form, ["good_through"]) || "";
    const rerunOnISO = readFirstNamedValue(form, ["rerun_on"]) || "";

    const goodThrough = goodThroughISO ? isoToMDY(goodThroughISO) : (vars.good_through || "");
    const rerunOn = rerunOnISO ? isoToMDY(rerunOnISO) : (vars.rerun_on || "");

    // allow both {{product_name}} and {{product}}
    return {
      ...vars,

      product_name: product,
      product: product,

      qcode: qcode,
      units_cm2: units,

      primary_insurance: primaryIns,
      secondary_insurance: secondaryIns,

      good_through: goodThrough,
      rerun_on: rerunOn,
    };
  }

  function applyTemplate(mode: "replace" | "append" | "insertTop") {
    if (!selected?.body) return;

    const liveVars = gatherLiveVars();
    const rendered = interpolate(normalizeNewlines(selected.body), liveVars).trim();
    if (!rendered) return;

    const current = normalizeNewlines(text).trimEnd();
    let next = current;

    if (mode === "replace") {
      next = rendered;
    } else if (mode === "append") {
      next = current ? `${current}\n\n${rendered}` : rendered;
    } else if (mode === "insertTop") {
      next = current ? `${rendered}\n\n${current}` : rendered;
    }

    setText(next);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 320, flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, marginBottom: 6 }}>
            Template
          </div>
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
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => applyTemplate("replace")}
            disabled={!selected?.body}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "#111",
              color: "white",
              fontWeight: 900,
              cursor: selected?.body ? "pointer" : "not-allowed",
              opacity: selected?.body ? 1 : 0.5,
            }}
          >
            Replace
          </button>

          <button
            type="button"
            onClick={() => applyTemplate("insertTop")}
            disabled={!selected?.body}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "var(--surface)",
              fontWeight: 900,
              cursor: selected?.body ? "pointer" : "not-allowed",
              opacity: selected?.body ? 1 : 0.6,
            }}
          >
            Insert at top
          </button>

          <button
            type="button"
            onClick={() => applyTemplate("append")}
            disabled={!selected?.body}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.18)",
              background: "var(--surface)",
              fontWeight: 900,
              cursor: selected?.body ? "pointer" : "not-allowed",
              opacity: selected?.body ? 1 : 0.6,
            }}
          >
            Append
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        {/* IMPORTANT: keep name="coverage_summary" so your server POST handler still receives it */}
        <textarea
          ref={textareaRef}
          name={name}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={rows}
          style={style}
        />
      </div>

      {selected?.body ? (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Tip: templates support placeholders like <b>{"{{qcode}}"}</b>, <b>{"{{product_name}}"}</b>,{" "}
          <b>{"{{good_through}}"}</b>, <b>{"{{rerun_on}}"}</b>, <b>{"{{units_cm2}}"}</b>.
        </div>
      ) : null}
    </div>
  );
}
