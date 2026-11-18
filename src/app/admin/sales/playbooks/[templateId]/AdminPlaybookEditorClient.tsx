"use client";

import { useRouter } from "next/navigation";
import React from "react";
import type { AdminPlaybookRow } from "@/lib/surgical-sales/preCallPlanTemplateAdminDb";
import {
  AdminPlaybookEditorShell,
  AdminPlaybookForm,
  AdminPlaybookSaveButton,
  EMPTY_PLAYBOOK_FORM,
  engagementLabel,
  playbookFormToPayload,
  scopeLabel,
  valuesFromPlaybook,
} from "../adminPlaybookFormShared";

export default function AdminPlaybookEditorClient({ playbook }: { playbook: AdminPlaybookRow }) {
  const router = useRouter();
  const [values, setValues] = React.useState(() => valuesFromPlaybook(playbook));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  async function save() {
    if (!values.name.trim() || !values.productLine || !values.engagementType) {
      setError("Name, product line, and engagement type are required.");
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sales/playbooks/${encodeURIComponent(playbook.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playbookFormToPayload(values)),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !j.ok) throw new Error(typeof j.error === "string" ? j.error : "Could not save playbook");
      setMessage("Playbook saved.");
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save playbook");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPlaybookEditorShell
      title={playbook.name}
      subtitle={`${scopeLabel(playbook.isSystemTemplate)} · ${playbook.productLine} · ${engagementLabel(playbook.engagementType)}${
        playbook.ownerLabel ? ` · ${playbook.ownerLabel}` : ""
      }`}
      backHref="/admin/sales/playbooks"
      error={error}
      message={message}
      footer={<AdminPlaybookSaveButton busy={busy} onClick={() => void save()} />}
    >
      <AdminPlaybookForm values={values} onChange={setValues} disabled={busy} />
    </AdminPlaybookEditorShell>
  );
}
