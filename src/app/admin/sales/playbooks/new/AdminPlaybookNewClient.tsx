"use client";

import { useRouter } from "next/navigation";
import React from "react";
import {
  AdminPlaybookEditorShell,
  AdminPlaybookForm,
  AdminPlaybookSaveButton,
  EMPTY_PLAYBOOK_FORM,
  playbookFormToPayload,
} from "../adminPlaybookFormShared";

export default function AdminPlaybookNewClient() {
  const router = useRouter();
  const [values, setValues] = React.useState(EMPTY_PLAYBOOK_FORM);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    if (!values.name.trim() || !values.productLine || !values.engagementType) {
      setError("Name, product line, and engagement type are required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sales/playbooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playbookFormToPayload(values)),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string; template?: { id: string } };
      if (!res.ok || !j.ok || !j.template?.id) {
        throw new Error(typeof j.error === "string" ? j.error : "Could not create playbook");
      }
      router.push(`/admin/sales/playbooks/${encodeURIComponent(j.template.id)}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not create playbook");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPlaybookEditorShell
      title="New company playbook"
      subtitle="Creates a shared playbook visible to reps when status is Active."
      backHref="/admin/sales/playbooks"
      error={error}
      footer={<AdminPlaybookSaveButton busy={busy} label="Create playbook" onClick={() => void save()} />}
    >
      <AdminPlaybookForm values={values} onChange={setValues} disabled={busy} />
    </AdminPlaybookEditorShell>
  );
}
