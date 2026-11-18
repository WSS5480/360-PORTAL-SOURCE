import type { PreCallPlanFieldKey } from "@/lib/surgical-sales/preCallPlanFields";

const FIELD_GUIDANCE: Partial<Record<PreCallPlanFieldKey, string>> = {
  observation_goal:
    "SMART sales objective: specific, measurable, with a dated next field action. Keep under 3 sentences.",
  pre_observation_impact_opening_statement:
    "Concise opening statement for the visit. Professional, direct, no fluff.",
  pre_observation_probes:
    "Discovery probes as short questions, one per line. Field-ready wording.",
  pre_observation_tools_resources:
    "Tools and resources to bring or reference. Bullet-style lines are fine.",
  pre_observation_value_hypothesis:
    "Value hypothesis tied to workflow and clinical outcomes. Concrete, not generic marketing.",
  pre_observation_planned_close:
    "Planned close and next step with a clear ask and timeframe.",
  pre_observation_additional_notes:
    "Strategic notes: risks, stakeholders, or follow-up. Brief and actionable.",
};

export function localPolishPreCallPlanFieldWording(text: string): string {
  const normalized = text
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
  if (!normalized) return "";
  const lines = normalized.split("\n").map((line) => {
    const t = line.trim();
    if (!t) return "";
    return t.charAt(0).toUpperCase() + t.slice(1);
  });
  return lines.filter(Boolean).join("\n");
}

async function callOpenAiPlainText(system: string, user: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:
        process.env.OPENAI_PREP_PLAN_FIELD_MODEL?.trim() ||
        process.env.OPENAI_LOG_UPDATE_MAP_MODEL?.trim() ||
        "gpt-4o-mini",
      temperature: 0.25,
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response");
  return content.replace(/^["']|["']$/g, "").trim();
}

export async function improvePreCallPlanFieldWording(input: {
  fieldKey: PreCallPlanFieldKey;
  fieldLabel: string;
  fieldHelper?: string;
  currentText: string;
  engagementTypeLabel?: string;
  providerName?: string;
  organizationName?: string;
}): Promise<{ text: string; usedAi: boolean }> {
  const current = input.currentText.trim();
  if (!current) {
    throw new Error("Add text before improving wording.");
  }

  const guidance =
    FIELD_GUIDANCE[input.fieldKey] ?? input.fieldHelper ?? "Clear, field-ready surgical sales language.";

  const contextParts = [
    input.engagementTypeLabel ? `Engagement type: ${input.engagementTypeLabel}` : null,
    input.providerName ? `Provider: ${input.providerName}` : null,
    input.organizationName ? `Organization: ${input.organizationName}` : null,
  ].filter(Boolean);

  const system = `You polish pre-call plan fields for medical device sales reps.
Rewrite the rep's draft to be clearer and more professional.
Preserve facts and intent — do not invent clinical details or commitments.
Return ONLY the improved field text, no quotes or commentary.
Field: ${input.fieldLabel}
Guidance: ${guidance}`;

  const user = `${contextParts.length > 0 ? `${contextParts.join("\n")}\n\n` : ""}Draft:\n${current}`;

  try {
    const text = await callOpenAiPlainText(system, user);
    if (!text) throw new Error("Empty improvement");
    return { text, usedAi: true };
  } catch (e: unknown) {
    const polished = localPolishPreCallPlanFieldWording(current);
    if (polished && polished !== current) {
      return { text: polished, usedAi: false };
    }
    const message = e instanceof Error ? e.message : "Could not improve wording";
    throw new Error(message);
  }
}
