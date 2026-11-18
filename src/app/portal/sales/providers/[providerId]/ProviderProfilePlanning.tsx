"use client";



import React from "react";

import type { ProviderPlanningCompletion } from "@/lib/surgical-sales/providerProfileFields";

import { ProviderPlanningStatusSummary } from "@/components/sales/ProviderPlanningStatusSummary";
import { PROVIDER_FIELD_OPS_SECTION } from "@/lib/surgical-sales/providerFieldOperationsUiLabels";



export function ProviderProfilePlanning({

  procedureFocus,

  setProcedureFocus,

  productInterests,

  setProductInterests,

  planning,

  saving,

  planMsg,

  onSave,

}: {

  planDraft: Record<string, string>;

  setPlanDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  procedureFocus: string;

  setProcedureFocus: (v: string) => void;

  productInterests: string;

  setProductInterests: (v: string) => void;

  planning?: ProviderPlanningCompletion;

  saving: boolean;

  planMsg: string | null;

  onSave: () => void;

}) {

  return (

    <section>

      <h2 className="provider-profile-section-title">
        {PROVIDER_FIELD_OPS_SECTION.operationalIntelligencePlanning}
      </h2>

      <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.45 }}>

        Persistent procedural, product, relationship, and observation context for this provider. Pre-Call Plan is captured

        per case, not here.

      </p>

      {planning ? (

        <div>

          <ProviderPlanningStatusSummary planning={planning} displayTone="strategist" />

        </div>

      ) : null}

      <div className="provider-profile-card">

        <div className="provider-profile-field">

          <label htmlFor="provider_procedure_focus">Procedure focus</label>

          <textarea

            id="provider_procedure_focus"

            rows={3}

            value={procedureFocus}

            onChange={(e) => setProcedureFocus(e.target.value)}

            disabled={saving}

          />

        </div>

        <div className="provider-profile-field">

          <label htmlFor="provider_product_interests">Product interests</label>

          <textarea

            id="provider_product_interests"

            rows={3}

            value={productInterests}

            onChange={(e) => setProductInterests(e.target.value)}

            disabled={saving}

          />

        </div>

        <p style={{ margin: 0, fontSize: 12, color: "var(--muted)", lineHeight: 1.45 }}>

          Use the Intelligence tab for workflow, OR, relationship, commercial, and observation readiness.

        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginTop: 8 }}>

          <button

            type="button"

            className="provider-profile-action provider-profile-action--primary"

            onClick={() => void onSave()}

            disabled={saving}

          >

            {saving ? "Saving…" : "Save intelligence"}

          </button>

          {planMsg ? (

            <span style={{ fontSize: 13, color: planMsg.includes("saved") ? "var(--brand-700)" : "var(--danger)" }}>

              {planMsg}

            </span>

          ) : null}

        </div>

      </div>

    </section>

  );

}


