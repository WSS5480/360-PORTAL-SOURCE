"use client";

import { useRef, useState, type RefObject } from "react";
import InventoryLookupClient from "./InventoryLookupClient";
import InventorySerialLookupClient from "./InventorySerialLookupClient";
import InventoryLocationsClient from "./InventoryLocationsClient";
import InventoryScanClient from "./InventoryScanClient";
import InventoryImportClient from "./InventoryImportClient";
import InventoryPdfRemoveClient from "./InventoryPdfRemoveClient";

const C = {
  borderSubtle: "rgba(0,0,0,0.08)",
  borderSoft: "rgba(0,0,0,0.10)",
  bgSoft: "rgba(0,0,0,0.02)",
};

function cardStyle(): React.CSSProperties {
  return {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: C.borderSoft,
    borderRadius: 18,
    background: "white",
    overflow: "hidden",
  };
}

function sectionHeaderButtonStyle(): React.CSSProperties {
  return {
    padding: 12,
    borderWidth: 0,
    borderStyle: "solid",
    borderColor: C.borderSubtle,
    borderBottomWidth: 1,
    fontWeight: 950,
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    background: "white",
    width: "100%",
    margin: 0,
    cursor: "pointer",
    textAlign: "left",
    font: "inherit",
  };
}

const expandToggleStyle: React.CSSProperties = {
  fontSize: 14,
  opacity: 0.55,
  fontWeight: 900,
  flexShrink: 0,
};

function CollapsibleCard(props: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  innerRef?: RefObject<HTMLDivElement | null>;
  /** When true, fills height in a grid row (top two-column layout) */
  rowStretch?: boolean;
}) {
  const { title, subtitle, open, onToggle, children, innerRef, rowStretch } = props;

  const sectionStyle: React.CSSProperties = rowStretch
    ? {
        ...cardStyle(),
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }
    : cardStyle();

  return (
    <section style={sectionStyle} ref={innerRef}>
      <button type="button" onClick={onToggle} aria-expanded={open} style={sectionHeaderButtonStyle()}>
        <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
          <div>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>{subtitle}</div>
        </div>
        <span style={expandToggleStyle} aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div style={{ padding: 12, background: C.bgSoft, flex: rowStretch ? 1 : undefined }}>{children}</div>
      ) : null}
    </section>
  );
}

export default function InventoryPageClient() {
  const [prefillSku, setPrefillSku] = useState<string>("");
  const [locationsNonce, setLocationsNonce] = useState(0);

  const [locationsOpen, setLocationsOpen] = useState(false);
  const [serialLookupOpen, setSerialLookupOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pdfRemoveOpen, setPdfRemoveOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const receiveRef = useRef<HTMLDivElement | null>(null);

  const row2ColStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
    gap: 14,
    alignItems: "stretch",
  };

  return (
    <>
      <div style={row2ColStyle}>
        <CollapsibleCard
          title="Inventory locations"
          subtitle="Name bins; receive and lot rows use these labels"
          open={locationsOpen}
          onToggle={() => setLocationsOpen((v) => !v)}
          rowStretch
        >
          <InventoryLocationsClient onChanged={() => setLocationsNonce((n) => n + 1)} />
        </CollapsibleCard>

        <CollapsibleCard
          title="Serial / lot lookup"
          subtitle="Trace a serial or lot across inventory and orders"
          open={serialLookupOpen}
          onToggle={() => setSerialLookupOpen((v) => !v)}
          rowStretch
        >
          <InventorySerialLookupClient />
        </CollapsibleCard>
      </div>

      <CollapsibleCard
        title="Lookup & Inventory View"
        subtitle="Browse SKUs → export selection → click row for lots/identifiers"
        open={lookupOpen}
        onToggle={() => setLookupOpen((v) => !v)}
      >
        <InventoryLookupClient
          locationsNonce={locationsNonce}
          onReceiveSku={(sku: string) => {
            const next = String(sku ?? "").trim();
            if (!next) return;
            setPrefillSku(next);
            setReceiveOpen(true);
            setTimeout(() => receiveRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
          }}
        />
      </CollapsibleCard>

      <CollapsibleCard
        title="Receive (Scan-In)"
        subtitle="SKU + qty + storage bin, then scan the label (traceability)"
        open={receiveOpen}
        onToggle={() => setReceiveOpen((v) => !v)}
        innerRef={receiveRef}
      >
        <InventoryScanClient prefillSku={prefillSku} locationsNonce={locationsNonce} />
      </CollapsibleCard>

      <CollapsibleCard
        title="Remove (Scan-out)"
        subtitle="Decrement on-hand; choose a removal reason"
        open={removeOpen}
        onToggle={() => setRemoveOpen((v) => !v)}
      >
        <InventoryScanClient locationsNonce={locationsNonce} mode="remove" />
      </CollapsibleCard>

      <CollapsibleCard
        title="Remove from delivery slip (PDF)"
        subtitle="Upload slip, preview lines, confirm — same rules as scan-out"
        open={pdfRemoveOpen}
        onToggle={() => setPdfRemoveOpen((v) => !v)}
      >
        <InventoryPdfRemoveClient />
      </CollapsibleCard>

      <CollapsibleCard
        title="Import Baseline (Advanced)"
        subtitle="Sets on-hand totals from export"
        open={importOpen}
        onToggle={() => setImportOpen((v) => !v)}
      >
        <InventoryImportClient />
      </CollapsibleCard>
    </>
  );
}
