"use client";

import React, { useEffect, useState } from "react";
import DropshipCard from "./DropshipCard";

type VendorOpt = { id: string; name: string; email: string };

export default function DropshipPanelClient(props: {
  fulfillmentId: string;
  orderId: string;
  accountId: string;
  isOpen: boolean;
  fulfillmentSource: "INVENTORY" | "DROPSHIP";
  dropshipVendorId: string;
  vendors: VendorOpt[];
  po: { number: string; sent_at: string; sent_to: string; bucket: string; path: string; status: string };
  packingSlip: { number: string; carrier: string; tracking: string; ship_date: string; notes: string } & Partial<{
    label_url: string;
    no_tracking: boolean;
    shipping_usd: string | number;
  }>;
  packingSlipFile?: { bucket: string; path: string; uploaded_at?: string } | null;
}) {
  const [show, setShow] = useState(props.fulfillmentSource === "DROPSHIP");
  const [panel, setPanel] = useState({
    fulfillmentId: props.fulfillmentId,
    orderId: props.orderId,
    accountId: props.accountId,
    isOpen: props.isOpen,
    fulfillmentSource: props.fulfillmentSource,
    dropshipVendorId: props.dropshipVendorId,
    vendors: props.vendors,
    po: props.po,
    packingSlip: props.packingSlip,
    packingSlipFile: props.packingSlipFile ?? null,
  });
  const [loading, setLoading] = useState(false);

  async function openPanelById(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/fulfillments/${encodeURIComponent(id)}/panel`, {
        headers: { accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json?.panel) {
        setPanel({
          fulfillmentId: String(json.panel.fulfillmentId),
          orderId: String(json.panel.orderId),
          accountId: String(json.panel.accountId),
          isOpen: !!json.panel.isOpen,
          fulfillmentSource: json.panel.fulfillmentSource,
          dropshipVendorId: String(json.panel.dropshipVendorId || ""),
          vendors: Array.isArray(json.panel.vendors) ? json.panel.vendors : [],
          po: json.panel.po,
          packingSlip: json.panel.packingSlip,
          packingSlipFile: json.panel.packingSlipFile ?? null,
        });
        setShow(true);
        return true;
      }
      try {
        localStorage.removeItem("dropship_fulfillment_id");
      } catch {}
    } catch {
      try {
        localStorage.removeItem("dropship_fulfillment_id");
      } catch {}
    } finally {
      setLoading(false);
    }
    return false;
  }

  async function ensureDropshipPanel() {
    try {
      const stored = localStorage.getItem("dropship_fulfillment_id");
      if (stored) {
        const ok = await openPanelById(stored);
        if (ok) return;
      }
    } catch {}

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(props.orderId)}/fulfillment/dropship`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && json?.fulfillment_id) {
        try {
          localStorage.setItem("dropship_fulfillment_id", String(json.fulfillment_id));
        } catch {}
        await openPanelById(String(json.fulfillment_id));
      }
    } catch {
      try {
        localStorage.removeItem("dropship_fulfillment_id");
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handleSelection(e: Event) {
      const detail = (e as CustomEvent).detail as { count?: number } | undefined;
      const selected = Number(detail?.count || 0) > 0;
      if (props.fulfillmentSource === "DROPSHIP") {
        setShow(true);
        return;
      }
      setShow(selected);
    }
    window.addEventListener("fulfillment-split-selection", handleSelection as EventListener);
    return () => window.removeEventListener("fulfillment-split-selection", handleSelection as EventListener);
  }, [props.fulfillmentSource]);

  useEffect(() => {
    setPanel((prev) => {
      if (prev.fulfillmentId !== props.fulfillmentId) return prev;
      return {
        ...prev,
        orderId: props.orderId,
        accountId: props.accountId,
        isOpen: props.isOpen,
        fulfillmentSource: props.fulfillmentSource,
        dropshipVendorId: props.dropshipVendorId,
        vendors: props.vendors,
        po: props.po,
        packingSlip: props.packingSlip,
        packingSlipFile: props.packingSlipFile ?? null,
      };
    });
  }, [
    props.fulfillmentId,
    props.orderId,
    props.accountId,
    props.isOpen,
    props.fulfillmentSource,
    props.dropshipVendorId,
    props.vendors,
    props.po,
    props.packingSlip,
    props.packingSlipFile,
  ]);

  useEffect(() => {
    if (!show) return;
    if (panel.fulfillmentSource === "DROPSHIP") return;
    ensureDropshipPanel().catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  useEffect(() => {
    function handleOpen(e: Event) {
      const detail = (e as CustomEvent).detail as { fulfillmentId?: string } | undefined;
      if (!detail?.fulfillmentId) return;
      void openPanelById(detail.fulfillmentId);
    }
    window.addEventListener("dropship-panel-open", handleOpen as EventListener);
    return () => window.removeEventListener("dropship-panel-open", handleOpen as EventListener);
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dropship_fulfillment_id");
      if (!stored) return;
      window.dispatchEvent(new CustomEvent("dropship-panel-open", { detail: { fulfillmentId: stored } }));
    } catch {}
  }, []);

  if (!show) return null;

  const isDropshipPanel = panel.fulfillmentSource === "DROPSHIP" || props.fulfillmentSource === "DROPSHIP";

  return (
    <div
      style={{
        borderRadius: 18,
        padding: 2,
        border: "1px solid rgba(217,70,239,0.35)",
        background: "rgba(217,70,239,0.07)",
      }}
    >
      {loading ? (
        <div style={{ padding: 12, fontWeight: 900 }}>Loading dropship panel…</div>
      ) : !isDropshipPanel ? (
        <div style={{ padding: 12, fontWeight: 900, fontSize: 13 }}>
          Select line items and assign dropship qty to open the dropship panel.
        </div>
      ) : (
        <DropshipCard
          fulfillmentId={panel.fulfillmentId}
          orderId={panel.orderId}
          accountId={panel.accountId}
          isOpen={panel.isOpen}
          fulfillmentSource={panel.fulfillmentSource}
          dropshipVendorId={panel.dropshipVendorId}
          vendors={panel.vendors}
          po={panel.po}
          packingSlip={panel.packingSlip}
          packingSlipFile={panel.packingSlipFile}
        />
      )}
    </div>
  );
}
