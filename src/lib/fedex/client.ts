import {
  findPreferredQuote,
  parseRateReplyDetails,
  preferredServiceUnavailableMessage,
  type RateQuote,
} from "@/lib/fedex/rateQuotes";

type FedexEnv = "sandbox" | "production";

type FedexAddress = {
  company: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postal: string;
  country: string;
};

type PackageDims = {
  weightLbs: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
};

type CreateLabelResult = {
  serviceType: string;
  trackingNumber: string;
  labelBase64: string;
  totalNetCharge: number;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

function requireEnv(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

function fedexMode(): FedexEnv {
  return env("FEDEX_ENV")?.toLowerCase() === "production" ? "production" : "sandbox";
}

function getBaseUrl(): string {
  return fedexMode() === "sandbox" ? "https://apis-sandbox.fedex.com" : "https://apis.fedex.com";
}

function toStreetLines(addr: FedexAddress): string[] {
  const lines = [addr.line1, addr.line2 || ""].map((x) => x.trim()).filter(Boolean);
  return lines.length ? lines : ["N/A"];
}

function toContact(addr: FedexAddress, preferCompany?: boolean) {
  const name = (addr.name || addr.company || "Recipient").trim();
  const company = (addr.company || "").trim();
  // FedEx: either personName or companyName required; do not send both (can cause validation errors)
  if ((preferCompany || company) && company) {
    return { companyName: company, phoneNumber: addr.phone };
  }
  return { personName: name || "Recipient", phoneNumber: addr.phone };
}

function toAddress(addr: FedexAddress) {
  return {
    streetLines: toStreetLines(addr),
    city: addr.city,
    stateOrProvinceCode: addr.state,
    postalCode: addr.postal,
    countryCode: addr.country || "US",
  };
}

async function getToken(): Promise<string> {
  const cached = tokenCache;
  if (cached && cached.expiresAt - Date.now() > 60_000) {
    return cached.token;
  }

  const clientId = requireEnv("FEDEX_CLIENT_ID");
  const clientSecret = requireEnv("FEDEX_CLIENT_SECRET");
  const url = `${getBaseUrl()}/oauth/token`;

  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.access_token) {
    const msg = json?.error_description || json?.error || `FedEx auth failed (${res.status})`;
    throw new Error(msg);
  }

  const expiresIn = Number(json.expires_in ?? 3600);
  const token = String(json.access_token);
  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

function saturdayDeliverySpecialServices(enabled?: boolean) {
  if (!enabled) return {};
  return {
    shipmentSpecialServices: {
      specialServiceTypes: ["SATURDAY_DELIVERY"],
    },
  };
}

async function rateQuotes(args: {
  accountNumber: string;
  shipFrom: FedexAddress;
  shipTo: FedexAddress;
  pkg: PackageDims;
  saturdayDelivery?: boolean;
}): Promise<RateQuote[]> {
  const token = await getToken();
  const url = `${getBaseUrl()}/rate/v1/rates/quotes`;

  const shipDate = new Date();
  const shipDateStr = shipDate.toISOString().slice(0, 10);

  const body = {
    accountNumber: { value: String(args.accountNumber).trim() },
    requestedShipment: {
      shipper: { contact: toContact(args.shipFrom), address: toAddress(args.shipFrom) },
      recipient: { contact: toContact(args.shipTo), address: toAddress(args.shipTo) },
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      packagingType: "YOUR_PACKAGING",
      rateRequestType: ["LIST", "ACCOUNT"],
      preferredCurrency: "USD",
      shipDateStamp: shipDateStr,
      ...saturdayDeliverySpecialServices(args.saturdayDelivery),
      requestedPackageLineItems: [
        {
          weight: { units: "LB", value: args.pkg.weightLbs },
          dimensions: {
            length: args.pkg.lengthIn,
            width: args.pkg.widthIn,
            height: args.pkg.heightIn,
            units: "IN",
          },
          groupPackageCount: 1,
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      json?.errors?.[0]?.message ||
      json?.message ||
      `FedEx rate quote failed (${res.status})`;
    throw new Error(msg);
  }

  const details = Array.isArray(json?.output?.rateReplyDetails) ? json.output.rateReplyDetails : [];
  const quotes = parseRateReplyDetails(details);

  if (quotes.length === 0) {
    const alerts = Array.isArray(json?.output?.alerts) ? json.output.alerts : [];
    const alertMsg = alerts
      .map((a: any) => a?.message || a?.code || String(a))
      .filter(Boolean)
      .join("; ");
    const debug = env("FEDEX_DEBUG") === "1";
    if (typeof console !== "undefined" && console.error) {
      console.error("[FedEx] No rates. Alerts:", alertMsg || "(none)");
      console.error("[FedEx] output keys:", json?.output ? Object.keys(json.output) : []);
      if (debug) console.error("[FedEx] Full response:", JSON.stringify(json, null, 2));
    }
    const err = noRatesError(alertMsg);
    if (debug && json) (err as any).fedexResponse = json;
    throw err;
  }

  return quotes;
}

function noRatesError(fedexMsg?: string): Error {
  const fedexEnv = fedexMode();
  const hint =
    fedexEnv === "sandbox"
      ? " In sandbox, try FEDEX_ENV=production with production credentials, or use a known-good test address (e.g. 100 Commercial St, Portland, ME 04101)."
      : " Check that origin/destination are valid US addresses (no PO boxes) and state is 2-letter (e.g. TX).";
  const msg = fedexMsg ? `FedEx: ${fedexMsg}. ` : "";
  return new Error(msg + "No FedEx rates returned." + hint);
}

async function createShipment(args: {
  accountNumber: string;
  shipFrom: FedexAddress;
  shipTo: FedexAddress;
  pkg: PackageDims;
  serviceType: string;
  saturdayDelivery?: boolean;
}): Promise<{ trackingNumber: string; labelBase64: string }> {
  const token = await getToken();
  const url = `${getBaseUrl()}/ship/v1/shipments`;

  const shipDateStr = new Date().toISOString().slice(0, 10);

  const recipientData = { contact: toContact(args.shipTo), address: toAddress(args.shipTo) };

  const body = {
    accountNumber: { value: String(args.accountNumber).trim() },
    labelResponseOptions: "LABEL",
    requestedShipment: {
      shipper: { contact: toContact(args.shipFrom, true), address: toAddress(args.shipFrom) },
      recipients: [recipientData],
      pickupType: "DROPOFF_AT_FEDEX_LOCATION",
      serviceType: args.serviceType,
      packagingType: "YOUR_PACKAGING",
      shipDateStamp: shipDateStr,
      ...saturdayDeliverySpecialServices(args.saturdayDelivery),
      shippingChargesPayment: {
        paymentType: "SENDER",
        payor: {
          responsibleParty: {
            accountNumber: { value: String(args.accountNumber).trim() },
            contact: toContact(args.shipFrom, true),
            address: toAddress(args.shipFrom),
          },
        },
      },
      labelSpecification: {
        labelFormatType: "COMMON2D",
        imageType: "PDF",
        // PAPER_85X11_TOP_HALF_LABEL is validated. STOCK_4X6.75/STOCK_4X6.5 are invalid.
        // For 4x6 thermal, try FEDEX_LABEL_STOCK_TYPE=PAPER_4X6 (unverified).
        labelStockType: env("FEDEX_LABEL_STOCK_TYPE") || "PAPER_85X11_TOP_HALF_LABEL",
      },
      requestedPackageLineItems: [
        {
          weight: { units: "LB", value: args.pkg.weightLbs },
          dimensions: {
            length: Math.floor(args.pkg.lengthIn),
            width: Math.floor(args.pkg.widthIn),
            height: Math.floor(args.pkg.heightIn),
            units: "IN",
          },
          groupPackageCount: 1,
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (env("FEDEX_DEBUG") === "1") {
      console.error("[FedEx Ship] Request body:", JSON.stringify(body, null, 2));
    }
    const allErrors = Array.isArray(json?.errors)
      ? json.errors.map((e: any) => e?.message || e?.code || JSON.stringify(e)).join("; ")
      : "";
    const msg =
      allErrors ||
      json?.output?.alerts?.map((a: any) => a?.message || a?.code).join("; ") ||
      json?.errors?.[0]?.message ||
      json?.message ||
      `FedEx shipment failed (${res.status})`;
    const err = new Error(msg);
    if (json) (err as any).fedexResponse = json;
    (err as any).fedexRequest = body;
    throw err;
  }

  const shipment = Array.isArray(json?.output?.transactionShipments)
    ? json.output.transactionShipments[0]
    : null;
  const piece = Array.isArray(shipment?.pieceResponses) ? shipment.pieceResponses[0] : null;
  const trackingNumber = String(piece?.trackingNumber ?? "").trim();

  let labelBase64 = "";
  const docs = Array.isArray(piece?.packageDocuments)
    ? piece.packageDocuments
    : Array.isArray(shipment?.shipmentDocuments)
      ? shipment.shipmentDocuments
      : [];
  if (docs.length) {
    labelBase64 = String(docs[0]?.encodedLabel ?? "").trim();
  }

  if (!trackingNumber || !labelBase64) {
    throw new Error("FedEx shipment returned no tracking or label.");
  }

  return { trackingNumber, labelBase64 };
}

/** Fetches FedEx rate quotes only (no label creation, no charge). */
export async function getFedexRatesOnly(args: {
  shipFrom: FedexAddress;
  shipTo: FedexAddress;
  pkg: PackageDims;
  saturdayDelivery?: boolean;
}): Promise<RateQuote[]> {
  const accountNumber = requireEnv("FEDEX_ACCOUNT_NUMBER");
  const quotes = await rateQuotes({
    accountNumber,
    shipFrom: args.shipFrom,
    shipTo: args.shipTo,
    pkg: args.pkg,
    saturdayDelivery: args.saturdayDelivery,
  });
  if (!quotes.length) throw noRatesError();
  return quotes.sort((a, b) => a.totalNetCharge - b.totalNetCharge);
}

export async function createFedexLabelCheapest(args: {
  shipFrom: FedexAddress;
  shipTo: FedexAddress;
  pkg: PackageDims;
}): Promise<CreateLabelResult> {
  const quotes = await getFedexRatesOnly(args);
  const cheapest = quotes[0];
  return createFedexLabel({
    ...args,
    preferredServiceType: cheapest.serviceType,
  });
}

/** Create a FedEx label for a specific service type (or preferred from quotes). */
export async function createFedexLabel(args: {
  shipFrom: FedexAddress;
  shipTo: FedexAddress;
  pkg: PackageDims;
  preferredServiceType?: string | null;
  saturdayDelivery?: boolean;
}): Promise<CreateLabelResult> {
  const accountNumber = requireEnv("FEDEX_ACCOUNT_NUMBER");
  let serviceType: string;
  let totalNetCharge: number;

  if (args.preferredServiceType) {
    const quotes = await getFedexRatesOnly(args);
    const match = findPreferredQuote(quotes, args.preferredServiceType);
    if (!match) {
      throw new Error(
        preferredServiceUnavailableMessage(args.preferredServiceType, quotes, {
          saturdayDelivery: args.saturdayDelivery,
        })
      );
    }
    serviceType = match.serviceType;
    totalNetCharge = match.totalNetCharge;
  } else {
    const quotes = await getFedexRatesOnly(args);
    const cheapest = quotes[0];
    serviceType = cheapest.serviceType;
    totalNetCharge = cheapest.totalNetCharge;
  }

  const shipment = await createShipment({
    accountNumber,
    shipFrom: args.shipFrom,
    shipTo: args.shipTo,
    pkg: args.pkg,
    serviceType,
    saturdayDelivery: args.saturdayDelivery,
  });

  return {
    serviceType,
    trackingNumber: shipment.trackingNumber,
    labelBase64: shipment.labelBase64,
    totalNetCharge,
  };
}

export function getShipFromFromEnv(): FedexAddress {
  return {
    company: requireEnv("FEDEX_SHIP_FROM_COMPANY"),
    name: requireEnv("FEDEX_SHIP_FROM_COMPANY"),
    phone: requireEnv("FEDEX_SHIP_FROM_PHONE"),
    line1: requireEnv("FEDEX_SHIP_FROM_LINE1"),
    line2: env("FEDEX_SHIP_FROM_LINE2") || "",
    city: requireEnv("FEDEX_SHIP_FROM_CITY"),
    state: requireEnv("FEDEX_SHIP_FROM_STATE"),
    postal: requireEnv("FEDEX_SHIP_FROM_POSTAL"),
    country: env("FEDEX_SHIP_FROM_COUNTRY") || "US",
  };
}
