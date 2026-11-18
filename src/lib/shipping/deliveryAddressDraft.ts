export type DeliveryAddressDraft = {
  company: string;
  attn: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
};

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function emptyDeliveryAddressDraft(): DeliveryAddressDraft {
  return {
    company: "",
    attn: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal: "",
    country: "US",
    phone: "",
  };
}

/** Normalize stored order/account address JSON into editable form fields. */
export function deliveryAddressToDraft(raw: unknown): DeliveryAddressDraft {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return emptyDeliveryAddressDraft();
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return emptyDeliveryAddressDraft();
    }
  }

  if (!obj || typeof obj !== "object") return emptyDeliveryAddressDraft();
  const o = obj as Record<string, unknown>;

  return {
    company: safeStr(o.company || o.facility_name || o.organization || o.name),
    attn: safeStr(o.attn || o.attention || o.contact_name),
    line1: safeStr(o.line1 || o.address1 || o.street1),
    line2: safeStr(o.line2 || o.address2 || o.street2),
    city: safeStr(o.city),
    state: safeStr(o.state || o.region),
    postal: safeStr(o.postal || o.zip || o.zip_code || o.zipCode || o.postal_code || o.postalCode),
    country: safeStr(o.country) || "US",
    phone: safeStr(o.phone),
  };
}
