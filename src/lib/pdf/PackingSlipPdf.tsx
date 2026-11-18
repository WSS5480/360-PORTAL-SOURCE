// src/lib/pdf/PackingSlipPdf.tsx
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

export type PackingSlipAddress = {
  name?: string | null;
  attn?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country?: string | null;
  phone?: string | null;
};

export type PackingSlipItem = {
  id: string;
  qty: number;
  uom: string;
  description: string;
  sku?: string | null;
  lot?: string | null;
  exp?: string | null; // already formatted
  /** Used server-side to backfill lot from inventory when pick data is incomplete */
  variantId?: string | null;
};

export type PackingSlipPdfProps = {
  logoDataUri?: string | null; // data:image/png;base64,...
  companyName: string;
  companyLine1?: string;
  companyLine2?: string;
  companyLine3?: string;

  fulfillmentIdShort: string;
  orderNumber?: string | null;
  invoiceShort?: string | null;
  createdAtLabel?: string | null;

  shipTo?: PackingSlipAddress | null;
  billTo?: PackingSlipAddress | null;

  items: PackingSlipItem[];
  note?: string | null;
};

const BRAND_BLUE = "#1e88e5";

// Default return address (used if generator doesn’t pass companyLine1/2)
const DEFAULT_COMPANY_LINE1 = "3900 N. 10th St. Suite 1050";
const DEFAULT_COMPANY_LINE2 = "McAllen, TX 78501";

const styles = StyleSheet.create({
  /** Reserve space so body text never draws under the fixed footer (was causing overlap on tight 4×6). */
  page: {
    paddingTop: 6,
    paddingBottom: 44,
    paddingHorizontal: 8,
    fontFamily: "Helvetica",
    fontSize: 7,
    color: "#111",
  },

  /**
   * One row: logo left, title right. Logo box matches ~11:3 (same as 132×36) so objectFit “contain”
   * doesn’t letterbox with huge empty bars. ~1.3× original footprint — 2× width/height won’t fit beside title on 4×6.
   */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    marginBottom: 4,
  },
  logoWrap: {
    flexShrink: 0,
    width: 170,
    height: 46,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  logoInline: {
    width: 170,
    height: 46,
    objectFit: "contain" as any,
  },

  headerRight: {
    alignItems: "flex-end",
    flexShrink: 0,
    maxWidth: "42%",
    marginLeft: 4,
  },

  headerRule: {
    height: 2,
    borderRadius: 2,
    backgroundColor: BRAND_BLUE,
    marginBottom: 4,
    width: "100%",
  },

  topTitleCol: { alignItems: "flex-end", flexShrink: 0 },

  companyName: { fontSize: 8, fontWeight: 900, marginTop: 0 },
  companyText: { lineHeight: 1.25, opacity: 0.9, marginTop: 0.5, fontSize: 6 },

  /** Full-width under title — avoids overlap with logo and narrow meta column */
  companyBlock: {
    marginTop: 3,
    marginBottom: 2,
    paddingRight: 2,
    width: "100%",
  },

  docTitle: { fontSize: 9, fontWeight: 900, letterSpacing: 0.2 },
  badge: {
    marginTop: 1,
    paddingVertical: 1,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(30,136,229,0.35)",
    backgroundColor: "rgba(30,136,229,0.10)",
    fontSize: 6,
    fontWeight: 900,
    color: "#111",
    alignSelf: "flex-end",
  },

  metaCard: {
    marginTop: 0,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 5,
    width: "100%",
    alignSelf: "stretch",
  },
  metaRowHalf: { flexDirection: "row", width: "100%" },
  metaItem: { width: "50%", paddingRight: 4, marginBottom: 1 },
  metaItemFull: { width: "100%", marginBottom: 3, paddingRight: 0 },
  metaLabel: { fontSize: 5.5, opacity: 0.65, marginBottom: 0.5, fontWeight: 900 },
  metaValue: { fontSize: 6.5, fontWeight: 900 },
  metaValueMultiline: { fontSize: 6, fontWeight: 900, width: "100%", lineHeight: 1.25 },

  divider: { marginTop: 2, height: 1, backgroundColor: "#E6E6E6" },

  addrRow: { flexDirection: "row", gap: 4, marginTop: 2 },
  addrBox: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 4,
    minHeight: 28,
  },
  addrTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  addrTitle: { fontSize: 6.5, fontWeight: 900, letterSpacing: 0.2, color: BRAND_BLUE },
  addrLine: { lineHeight: 1.25, fontSize: 6.5 },

  table: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 4,
    overflow: "hidden",
    width: "100%",
  },
  /** Two-row header: identifiers on row 1; description label full width on row 2 (avoids desc vs SKU/lot overlap). */
  thead: {
    backgroundColor: "rgba(30,136,229,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E6E6",
    width: "100%",
  },
  theadTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 4,
    width: "100%",
  },
  theadDescBand: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(30,136,229,0.18)",
    width: "100%",
  },
  theadLabel: { fontSize: 6, fontWeight: 900, letterSpacing: 0.2 },

  /** One item = top row (qty, unit, sku, lot, exp) + full-width description row. */
  itemBlock: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#EFEFEF",
  },
  itemBlockAlt: { backgroundColor: "#FAFAFA" },
  itemRowTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 4,
    width: "100%",
  },
  itemDescRow: {
    width: "100%",
    paddingHorizontal: 4,
    paddingTop: 0,
    paddingBottom: 4,
  },
  itemDescText: { fontSize: 6, lineHeight: 1.35, width: "100%" },

  /** Percent widths sum to 100% — no flexGrow, so Yoga cannot collapse/overlap columns. */
  cellQty: { width: "9%", flexShrink: 0, paddingRight: 2, alignItems: "flex-end" },
  cellUom: { width: "11%", flexShrink: 0, paddingRight: 2 },
  cellSku: { width: "24%", flexShrink: 0, paddingRight: 2, minWidth: 0 },
  cellLot: { width: "29%", flexShrink: 0, paddingRight: 2, minWidth: 0 },
  cellExp: { width: "27%", flexShrink: 0, minWidth: 0 },

  colQty: { textAlign: "right", fontWeight: 900, fontSize: 6 },
  colUom: { opacity: 0.9, fontSize: 6 },
  colDesc: { fontSize: 6 },
  colSku: { fontSize: 6 },
  colLot: { fontSize: 5.5 },
  colExp: { fontSize: 6 },

  mono: { fontFamily: "Courier" },
  muted: { opacity: 0.7 },

  // Notes optional; keep compact
  noteCard: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 4,
    padding: 3,
    backgroundColor: "#FAFAFA",
  },
  noteTitle: { fontSize: 6.5, fontWeight: 900, color: BRAND_BLUE },
  noteText: { marginTop: 1, opacity: 0.9, lineHeight: 1.25, fontSize: 6 },

  signRow: { marginTop: 2, flexDirection: "row", gap: 4 },
  signBox: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
    minHeight: 18,
  },
  signLabel: { fontSize: 5.5, opacity: 0.75, fontWeight: 900 },
  signLine: { marginTop: 6, height: 1, backgroundColor: "#E6E6E6" },

  footer: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 6,
    fontSize: 5.5,
    opacity: 0.7,
    lineHeight: 1.25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: { width: "75%" },
  footerRight: { width: "25%", textAlign: "right" },
});

function fmtAddr(a?: PackingSlipAddress | null) {
  if (!a) return [];
  const lines: string[] = [];

  const name = (a.name ?? "").trim();
  const attn = (a.attn ?? "").trim();
  const l1 = (a.line1 ?? "").trim();
  const l2 = (a.line2 ?? "").trim();
  const city = (a.city ?? "").trim();
  const st = (a.state ?? "").trim();
  const zip = (a.zip ?? "").trim();
  const country = (a.country ?? "").trim();
  const phone = (a.phone ?? "").trim();

  if (name) lines.push(name);
  if (attn) lines.push(`Attn: ${attn}`);
  if (l1) lines.push(l1);
  if (l2) lines.push(l2);

  const cs = [city, st].filter(Boolean).join(", ").trim();
  const csz = [cs, zip].filter(Boolean).join(" ").trim();
  if (csz) lines.push(csz);

  if (country) lines.push(country);
  if (phone) lines.push(`Phone: ${phone}`);

  return lines;
}

function safeText(v: any, fallback = "—") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

/** Glue “S/N ” to the serial so the label stays with the number (NBSP only — no per-char joiners). */
function glueLotSnPrefix(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s || s === "—") return s || "—";
  return s.replace(/\bS\/N\s+/gi, `S/N${"\u00A0"}`);
}

/** Prevent react-pdf from hyphenating long tokens (e.g. “default” → “de”/“fault”) in narrow columns. */
const noHyphenation: (word: string) => string[] = (word) => [word];

export default function PackingSlipPdf(props: PackingSlipPdfProps) {
  const shipLines = fmtAddr(props.shipTo);
  const billLines = fmtAddr(props.billTo);

  const companyLine1 = (props.companyLine1 ?? "").trim() || DEFAULT_COMPANY_LINE1;
  const companyLine2 = (props.companyLine2 ?? "").trim() || DEFAULT_COMPANY_LINE2;
  const companyLine3 = (props.companyLine3 ?? "").trim() || "";

  return (
    <Document title={`Packing Slip ${props.fulfillmentIdShort}`}>
      <Page size={[4 * 72, 6 * 72]} style={styles.page} wrap>
        <View style={styles.headerRow}>
          <View style={styles.logoWrap}>
            {props.logoDataUri ? (
              <Image style={styles.logoInline} src={props.logoDataUri} />
            ) : (
              <View style={{ width: 170, height: 46 }} />
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>PACKING SLIP</Text>
            <Text style={styles.badge}>WAREHOUSE COPY</Text>
          </View>
        </View>
        <View style={styles.headerRule} />

        <View style={styles.metaCard}>
          <View style={styles.metaRowHalf}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Fulfillment</Text>
              <Text style={[styles.metaValue, styles.mono]} wrap>
                {safeText(props.fulfillmentIdShort)}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue} wrap>
                {safeText(props.createdAtLabel, "—")}
              </Text>
            </View>
          </View>

          <View style={styles.metaItemFull}>
            <Text style={styles.metaLabel}>Order</Text>
            <Text style={[styles.metaValueMultiline, styles.mono]} wrap>
              {safeText(props.orderNumber, "—")}
            </Text>
          </View>

          <View style={styles.metaItemFull}>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={[styles.metaValueMultiline, styles.mono]} wrap>
              {safeText(props.invoiceShort, "—")}
            </Text>
          </View>
        </View>

        <View style={styles.companyBlock}>
          <Text style={styles.companyName}>{safeText(props.companyName)}</Text>
          {companyLine1 ? (
            <Text style={styles.companyText} wrap>
              {companyLine1}
            </Text>
          ) : null}
          {companyLine2 ? (
            <Text style={styles.companyText} wrap>
              {companyLine2}
            </Text>
          ) : null}
          {companyLine3 ? (
            <Text style={styles.companyText} wrap>
              {companyLine3}
            </Text>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Addresses (condensed) */}
        <View style={styles.addrRow}>
          <View style={styles.addrBox}>
            <View style={styles.addrTitleRow}>
              <Text style={styles.addrTitle}>SHIP TO</Text>
              <Text style={[styles.muted, { fontSize: 8.6 }]}>Delivery</Text>
            </View>
            {shipLines.length ? (
              shipLines.map((l, idx) => (
                <Text key={idx} style={styles.addrLine} wrap>
                  {l}
                </Text>
              ))
            ) : (
              <Text style={[styles.addrLine, styles.muted]}>—</Text>
            )}
          </View>

          <View style={styles.addrBox}>
            <View style={styles.addrTitleRow}>
              <Text style={styles.addrTitle}>BILL TO</Text>
              <Text style={[styles.muted, { fontSize: 8.6 }]}>Billing</Text>
            </View>
            {billLines.length ? (
              billLines.map((l, idx) => (
                <Text key={idx} style={styles.addrLine} wrap>
                  {l}
                </Text>
              ))
            ) : (
              <Text style={[styles.addrLine, styles.muted]}>—</Text>
            )}
          </View>
        </View>

        {/* Items */}
        <View style={styles.table}>
          <View style={styles.thead}>
            <View style={styles.theadTopRow}>
              <View style={styles.cellQty}>
                <Text style={[styles.theadLabel, styles.colQty]}>QTY</Text>
              </View>
              <View style={styles.cellUom}>
                <Text style={[styles.theadLabel, styles.colUom]}>UNIT</Text>
              </View>
              <View style={styles.cellSku}>
                <Text style={[styles.theadLabel, styles.colSku]}>SKU</Text>
              </View>
              <View style={styles.cellLot}>
                <Text style={[styles.theadLabel, styles.colLot]}>LOT</Text>
              </View>
              <View style={styles.cellExp}>
                <Text style={[styles.theadLabel, styles.colExp]}>EXP</Text>
              </View>
            </View>
            <View style={styles.theadDescBand}>
              <Text style={styles.theadLabel}>ITEM DESCRIPTION</Text>
            </View>
          </View>

          {(props.items ?? []).map((it, idx) => {
            const blockStyle = idx % 2 === 1 ? [styles.itemBlock, styles.itemBlockAlt] : [styles.itemBlock];
            return (
              <View key={it.id} style={blockStyle as any}>
                <View style={styles.itemRowTop}>
                  <View style={styles.cellQty}>
                    <Text style={styles.colQty}>{Number.isFinite(it.qty) ? String(it.qty) : "0"}</Text>
                  </View>
                  <View style={styles.cellUom}>
                    <Text style={styles.colUom} wrap>
                      {safeText(it.uom, "Units")}
                    </Text>
                  </View>
                  <View style={styles.cellSku}>
                    <Text style={[styles.colSku, styles.mono]} wrap>
                      {safeText(it.sku, "—")}
                    </Text>
                  </View>
                  <View style={styles.cellLot}>
                    <Text style={[styles.colLot, styles.mono]} wrap hyphenationCallback={noHyphenation}>
                      {glueLotSnPrefix(safeText(it.lot, "—"))}
                    </Text>
                  </View>
                  <View style={styles.cellExp}>
                    <Text style={[styles.colExp, styles.mono]} wrap>
                      {safeText(it.exp, "—")}
                    </Text>
                  </View>
                </View>
                <View style={styles.itemDescRow}>
                  <Text style={[styles.itemDescText, styles.colDesc]} wrap>
                    {safeText(it.description)}
                  </Text>
                </View>
              </View>
            );
          })}

          {(props.items ?? []).length === 0 ? (
            <View style={{ paddingVertical: 6, paddingHorizontal: 4, width: "100%" }}>
              <Text style={styles.muted} wrap>
                No items.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Optional note */}
        {props.note ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Notes</Text>
            <Text style={styles.noteText} wrap>
              {props.note}
            </Text>
          </View>
        ) : null}

        {/* Signatures */}
        <View style={styles.signRow}>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Packed by</Text>
            <View style={styles.signLine} />
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Checked by</Text>
            <View style={styles.signLine} />
          </View>
          <View style={styles.signBox}>
            <Text style={styles.signLabel}>Boxes</Text>
            <View style={styles.signLine} />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            <Text>This document is a packing slip only and is not an invoice.</Text>
            <Text>Report discrepancies within 48 hours to your support contact.</Text>
          </View>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
            fixed
          />
        </View>
      </Page>
    </Document>
  );
}
