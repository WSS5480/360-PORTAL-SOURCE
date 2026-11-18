import { credentialAllows, hashPartnerApiKey, readBearerToken, type PartnerOrderScope } from "@/lib/integrations/partnerCredentials";

export type AuthenticatedPartner = {
  partnerId: string;
  code: string;
  name: string;
  environment: "sandbox" | "production";
  status: string;
  credentialId: string;
  scopes: string[];
};

export type PartnerAuthFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
  errorCode: "unauthorized" | "forbidden";
};

export type PartnerAuthSuccess = { ok: true; partner: AuthenticatedPartner };

type CredentialRow = {
  id: string;
  partner_id: string;
  scopes: string[] | null;
  active: boolean;
  revoked_at: string | null;
  direction: string;
  key_hash: string | null;
};

type PartnerRow = {
  id: string;
  code: string;
  name: string;
  environment: string;
  status: string;
};

export async function authenticatePartnerRequest(
  sb: {
    from: (table: string) => any;
  },
  authorizationHeader: string | null,
  requiredScope: PartnerOrderScope
): Promise<PartnerAuthSuccess | PartnerAuthFailure> {
  const token = readBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, status: 401, error: "Missing or invalid API key.", errorCode: "unauthorized" };
  }

  const keyHash = hashPartnerApiKey(token);
  const { data: credential, error: credentialError } = await sb
    .from("integration_credentials")
    .select("id, partner_id, scopes, active, revoked_at, direction, key_hash")
    .eq("key_hash", keyHash)
    .eq("direction", "inbound")
    .maybeSingle();

  if (credentialError || !credential) {
    return { ok: false, status: 401, error: "Missing or invalid API key.", errorCode: "unauthorized" };
  }

  const row = credential as CredentialRow;
  if (!row.active || row.revoked_at || row.direction !== "inbound" || row.key_hash !== keyHash) {
    return { ok: false, status: 401, error: "Missing or invalid API key.", errorCode: "unauthorized" };
  }

  const { data: partner, error: partnerError } = await sb
    .from("integration_partners")
    .select("id, code, name, environment, status")
    .eq("id", row.partner_id)
    .maybeSingle();

  if (partnerError || !partner) {
    return { ok: false, status: 401, error: "Missing or invalid API key.", errorCode: "unauthorized" };
  }

  const partnerRow = partner as PartnerRow;
  if (partnerRow.environment === "production" || partnerRow.status !== "active") {
    return { ok: false, status: 401, error: "Missing or invalid API key.", errorCode: "unauthorized" };
  }

  const scopes = Array.isArray(row.scopes) ? row.scopes : [];
  if (!credentialAllows(scopes, requiredScope)) {
    return { ok: false, status: 403, error: "API key does not include the required scope.", errorCode: "forbidden" };
  }

  void sb
    .from("integration_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => undefined, () => undefined);

  return {
    ok: true,
    partner: {
      partnerId: partnerRow.id,
      code: partnerRow.code,
      name: partnerRow.name,
      environment: partnerRow.environment === "production" ? "production" : "sandbox",
      status: partnerRow.status,
      credentialId: row.id,
      scopes,
    },
  };
}
