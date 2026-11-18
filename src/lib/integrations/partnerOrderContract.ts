import { createHash } from "node:crypto";
import { z } from "zod";
import { ShippingPrioritySchema } from "@/lib/orders/shippingPriority";

const AddressSchema = z.object({
  company: z.string().trim().max(200).nullable().optional(),
  attn: z.string().trim().max(200).nullable().optional(),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().max(80).nullable().optional(),
  postal: z.string().trim().min(1).max(32),
  country: z.string().trim().max(80).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().max(200).nullable().optional(),
});

export const PartnerOrderLineSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  quantity: z.number().int().positive().max(100000),
  product_name: z.string().trim().max(200).optional(),
  manufacturer: z.string().trim().max(120).optional(),
  size: z.string().trim().max(80).optional(),
  width_cm: z.number().positive().max(10000).optional(),
  length_cm: z.number().positive().max(10000).optional(),
  unit_of_sale: z.string().trim().max(40).optional(),
});

export const CreatePartnerOrderSchema = z.object({
  partner_order_number: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/),
  partner_account_ref: z.string().trim().min(1).max(128),
  customer: z
    .object({
      name: z.string().trim().min(1).max(200),
      email: z.string().trim().email().max(200).optional(),
    })
    .optional(),
  contact: z
    .object({
      name: z.string().trim().max(200).optional(),
      email: z.string().trim().email().max(200).optional(),
    })
    .optional(),
  billing_address: AddressSchema,
  shipping_address: AddressSchema,
  shipping_priority: ShippingPrioritySchema.optional(),
  lines: z.array(PartnerOrderLineSchema).min(1).max(100),
});

export type CreatePartnerOrderInput = z.infer<typeof CreatePartnerOrderSchema>;

export type NormalizedPartnerOrder = CreatePartnerOrderInput & {
  shipping_priority: z.infer<typeof ShippingPrioritySchema>;
};

function normalizeAddress(address: z.infer<typeof AddressSchema>) {
  return {
    company: address.company ?? null,
    attn: address.attn ?? null,
    line1: address.line1,
    line2: address.line2 ?? null,
    city: address.city,
    state: address.state ?? null,
    postal: address.postal,
    country: address.country ?? null,
    phone: address.phone ?? null,
    email: address.email ?? null,
  };
}

export function normalizePartnerOrder(input: CreatePartnerOrderInput): NormalizedPartnerOrder {
  return {
    partner_order_number: input.partner_order_number,
    partner_account_ref: input.partner_account_ref,
    customer: input.customer
      ? {
          name: input.customer.name,
          email: input.customer.email,
        }
      : undefined,
    contact: input.contact
      ? {
          name: input.contact.name,
          email: input.contact.email,
        }
      : undefined,
    billing_address: normalizeAddress(input.billing_address),
    shipping_address: normalizeAddress(input.shipping_address),
    shipping_priority: input.shipping_priority ?? "GROUND",
    lines: input.lines.map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      product_name: line.product_name,
      manufacturer: line.manufacturer,
      size: line.size,
      width_cm: line.width_cm,
      length_cm: line.length_cm,
      unit_of_sale: line.unit_of_sale,
    })),
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const child = (value as Record<string, unknown>)[key];
      if (child === undefined) continue;
      out[key] = canonicalize(child);
    }
    return out;
  }
  return value;
}

export function partnerOrderRequestHash(order: NormalizedPartnerOrder): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(order)), "utf8").digest("hex");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
