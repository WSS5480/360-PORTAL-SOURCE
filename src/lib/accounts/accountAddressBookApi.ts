import { z } from "zod";

export const AccountAddressKindSchema = z.enum(["BILLING", "SHIPPING"]);

export const AccountAddressJsonSchema = z
  .object({
    company: z.string().optional().nullable(),
    attn: z.string().optional().nullable(),
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postal: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .passthrough();

export const CreateAccountAddressSchema = z.object({
  kind: AccountAddressKindSchema,
  label: z.string().min(1).max(120),
  is_default: z.boolean().optional(),
  address: AccountAddressJsonSchema,
});

export function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export function safeBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = safeStr(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

export async function parseAccountAddressBody(req: Request): Promise<any | null> {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    return await req.json().catch(() => null);
  }

  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const obj: any = {};
    for (const [k, v] of form.entries()) obj[k] = typeof v === "string" ? v : String(v);
    return obj;
  }

  return null;
}

export function normalizeAddressFromFlat(obj: any): any {
  if (obj && typeof obj === "object") {
    if (obj.address && typeof obj.address === "object") return obj.address;

    const pick = (k: string) => {
      const direct = obj[k];
      const pref = obj[`address_${k}`];
      const v = direct ?? pref;
      const s = safeStr(v);
      return s ? s : null;
    };

    return {
      company: pick("company"),
      attn: pick("attn"),
      line1: pick("line1"),
      line2: pick("line2"),
      city: pick("city"),
      state: pick("state"),
      postal: pick("postal"),
      country: pick("country"),
      phone: pick("phone"),
      email: pick("email"),
      notes: pick("notes"),
    };
  }
  return {};
}

export async function insertAccountAddressRow(
  sb: any,
  args: {
    accountId: string;
    kind: "BILLING" | "SHIPPING";
    label: string;
    is_default: boolean;
    address: z.infer<typeof AccountAddressJsonSchema>;
    createdByUserId: string | null;
  },
) {
  if (args.is_default) {
    const { error: clearErr } = await sb
      .from("account_addresses")
      .update({ is_default: false })
      .eq("account_id", args.accountId)
      .eq("kind", args.kind)
      .is("disabled_at", null)
      .eq("is_default", true);

    if (clearErr) throw new Error(clearErr.message);
  }

  const { data, error } = await sb
    .from("account_addresses")
    .insert({
      account_id: args.accountId,
      kind: args.kind,
      label: args.label,
      is_default: !!args.is_default,
      address: args.address,
      created_by_user_id: args.createdByUserId,
    })
    .select("id, account_id, kind, label, is_default, address, created_at, updated_at, disabled_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}
