type OriginDb = {
  from: (table: string) => any;
};

export async function loadPartnerOrigin(
  sb: OriginDb,
  orderId: string
): Promise<{ partnerName: string; externalOrderNumber: string } | null> {
  if (!orderId) return null;
  const { data, error } = await sb
    .from("integration_partner_orders")
    .select("external_order_number, partner_id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error || !data?.partner_id) return null;

  const { data: partner } = await sb
    .from("integration_partners")
    .select("name")
    .eq("id", data.partner_id)
    .maybeSingle();

  return {
    partnerName: String(partner?.name || "Partner"),
    externalOrderNumber: String(data.external_order_number || ""),
  };
}
