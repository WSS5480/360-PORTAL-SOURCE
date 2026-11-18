export type MfaLoginStep = "done" | "challenge" | "enroll";

/** After a password sign-in, decide whether MFA is complete, a code is needed, or enrollment is needed. */
export function mfaStepAfterPassword(aal: {
  currentLevel?: string | null;
  nextLevel?: string | null;
} | null): MfaLoginStep {
  const current = String(aal?.currentLevel || "aal1").toLowerCase();
  const next = String(aal?.nextLevel || "aal1").toLowerCase();
  if (current === "aal2") return "done";
  if (next === "aal2") return "challenge";
  return "enroll";
}

export function totpQrImageSrc(qrCode: string): string {
  const raw = String(qrCode || "").trim();
  if (!raw) return "";
  if (raw.startsWith("data:")) return raw;
  if (raw.startsWith("<") || raw.includes("<svg")) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
  }
  try {
    return `data:image/svg+xml;base64,${btoa(raw)}`;
  } catch {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(raw)}`;
  }
}

export function groupedTotpSecret(secret: string): string {
  return String(secret || "")
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();
}
