import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function keyBytes(raw: string | undefined): Buffer | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^[a-f0-9]{64}$/i.test(value)) return Buffer.from(value, "hex");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length === 32) return decoded;
  return createHash("sha256").update(value, "utf8").digest();
}

export function encryptOutboundSecret(plaintext: string, keyMaterial = process.env.INTEGRATION_CREDENTIALS_KEY): string | null {
  const key = keyBytes(keyMaterial);
  if (!key || !plaintext) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptOutboundSecret(ciphertext: string, keyMaterial = process.env.INTEGRATION_CREDENTIALS_KEY): string | null {
  const key = keyBytes(keyMaterial);
  if (!key) return null;
  const parts = ciphertext.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const iv = Buffer.from(parts[1] ?? "", "base64url");
    const tag = Buffer.from(parts[2] ?? "", "base64url");
    const encrypted = Buffer.from(parts[3] ?? "", "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
