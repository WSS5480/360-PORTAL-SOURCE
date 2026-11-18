/** Turn portal API `error` payloads (string or Zod flatten object) into user-facing text. */
export function formatPortalApiError(error: unknown, fallback = "Request failed"): string {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (!error || typeof error !== "object") return fallback;

  const flat = error as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
  const messages = [
    ...(flat.formErrors ?? []),
    ...Object.values(flat.fieldErrors ?? {}).flatMap((v) => v ?? []),
  ].filter((m) => typeof m === "string" && m.trim());

  return messages.length > 0 ? messages.join(" ") : fallback;
}
