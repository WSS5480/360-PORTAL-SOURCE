import {
  describeRegionCodeIssue,
  normalizeRegionCode,
  regionCodeLooksValidForFedEx,
} from "@/lib/shipping/normalizeRegionCode";

export type FedexShipToAddress = {
  company: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function parseFedexShipTo(addr: unknown):
  | { ok: true; value: FedexShipToAddress }
  | { ok: false; error: string } {
  const a = addr && typeof addr === "object" ? (addr as Record<string, unknown>) : {};

  const line1 = safeStr(a.line1 || a.address1 || a.street1);
  const line2 = safeStr(a.line2 || a.address2 || a.street2);
  const city = safeStr(a.city);
  const country = safeStr(a.country) || "US";
  const stateRaw = safeStr(a.state || a.region);
  const state = normalizeRegionCode(stateRaw, country);
  const postal = safeStr(
    a.postal || a.zip || a.zip_code || a.zipCode || a.postal_code || a.postalCode
  );
  const phone = safeStr(a.phone);
  const company = safeStr(a.company) || safeStr(a.attn) || "Customer";
  const name = safeStr(a.attn) || safeStr(a.company) || "Customer";

  const missing: string[] = [];
  if (!line1) missing.push("street address");
  if (!city) missing.push("city");
  if (!state) missing.push("state/province (2-letter code)");
  if (!postal) missing.push("postal/zip");
  if (missing.length) {
    return {
      ok: false,
      error: `Shipping address missing: ${missing.join(", ")}. Edit the ship-to address below and try again.`,
    };
  }

  const regionIssue = describeRegionCodeIssue(stateRaw, state);
  if (regionIssue || !regionCodeLooksValidForFedEx(state, country)) {
    return {
      ok: false,
      error:
        regionIssue ||
        `State/province "${stateRaw || state}" must be a 2-letter code for FedEx. Edit the ship-to address below and try again.`,
    };
  }

  return {
    ok: true,
    value: {
      company,
      name,
      phone: phone || "555-000-0000",
      line1,
      line2: line2 || "",
      city,
      state: state.toUpperCase(),
      postal,
      country: country.toUpperCase(),
    },
  };
}

export function formatShipToOneLine(addr: unknown): string {
  const parsed = parseFedexShipTo(addr);
  if (!parsed.ok) {
    const a = addr && typeof addr === "object" ? (addr as Record<string, unknown>) : {};
    const parts = [
      safeStr(a.company),
      safeStr(a.line1),
      [safeStr(a.city), safeStr(a.state), safeStr(a.postal || a.zip)].filter(Boolean).join(" "),
      safeStr(a.country),
    ].filter(Boolean);
    return parts.join(" · ") || "—";
  }
  const v = parsed.value;
  return [v.company, v.line1, `${v.city}, ${v.state} ${v.postal}`, v.country].filter(Boolean).join(" · ");
}
