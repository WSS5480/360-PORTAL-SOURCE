# 360 Medical partner order API

This guide matches the sandbox implementation in this repository. The machine-readable contract is `docs/openapi/partner-orders-v1.yaml`.

The sandbox host is not published yet. Replace `https://sandbox.example.invalid` only after 360 issues the sandbox base URL. Do not call production.

## Authentication

Send the sandbox key on every order request:

```http
Authorization: Bearer 360_...
```

360 issues the key from Admin → Integrations. The plaintext is shown once. 360 stores a prefix and a SHA-256 hash.

The key must be an active inbound credential for an active sandbox partner. Production partners cannot authenticate. A missing, revoked, or inactive key returns HTTP 401. A key without `orders:write` cannot create orders and returns HTTP 403. `orders:write` can also read orders.

Limit: 60 requests per partner per minute. HTTP 429 means wait briefly and retry the same request.

## Order submission

`POST /api/integrations/v1/orders`

`GET /api/integrations/v1/orders/{partner_order_number}`

`partner_order_number` is 1–64 characters, starting with a letter or digit, then letters, digits, `.`, `_`, `:`, or `-`. It is the id 360 uses on every callback. The response `order_number` is a separate 360 number. Do not send `order_number` back as the partner order number.

### Create a new clinic

Automatic account creation must already be enabled for the partner, with an approved discount and payment terms saved by 360. The external customer id has to be new for this partner.

```json
{
  "partner_order_number": "NIMBLE-1001",
  "partner_account_ref": "clinic-1001",
  "customer": { "name": "Example Clinic" },
  "billing_address": {
    "line1": "100 Example Ave",
    "city": "Austin",
    "state": "TX",
    "postal": "78701",
    "country": "US"
  },
  "shipping_address": {
    "line1": "100 Example Ave",
    "city": "Austin",
    "state": "TX",
    "postal": "78701",
    "country": "US"
  },
  "shipping_priority": "GROUND",
  "lines": [
    {
      "sku": "PARTNER-SKU-1",
      "quantity": 1,
      "product_name": "Example dressing",
      "manufacturer": "Example Maker",
      "size": "2x2",
      "unit_of_sale": "Units"
    }
  ]
}
```

### Recognized clinic

Send the same `partner_account_ref`. `customer` may be omitted. If it is sent, 360 does not rename the account and does not change its pricing.

```http
POST /api/integrations/v1/orders
Authorization: Bearer 360_...
Idempotency-Key: NIMBLE-1001
Content-Type: application/json
```

### Success

HTTP 200.

```json
{
  "ok": true,
  "idempotent_replay": false,
  "request_id": "4f3a0a2e-6a1b-4d2e-9c31-0d5a6e7b8c9d",
  "order": {
    "id": "11111111-1111-4111-8111-111111111111",
    "order_number": "ORD-20261021-AB12CD",
    "partner_order_number": "NIMBLE-1001",
    "status": "CONFIRMED",
    "currency": "USD",
    "subtotal": 95,
    "shipping_total": 0,
    "total": 95,
    "lines": [
      {
        "sku": "SYN-2X2",
        "product_variant_id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        "quantity": 1,
        "unit_price": 100,
        "discount_percent": 5,
        "line_total": 95
      }
    ]
  }
}
```

`lines[].sku` in the response is the 360 catalog SKU stored on the order. When a mapping was used, it can differ from the SKU in the request. `shipping_total` is 0 at intake. 360 adds freight before the invoice callback.

An identical retry returns the same order with `idempotent_replay: true`.

## Required customer fields

| Field | When required |
| --- | --- |
| `partner_account_ref` | Every order. Unique for this partner, not across partners. 1–128 characters. |
| `customer.name` | Required only when the reference is new and automatic account creation is enabled. |
| `billing_address.line1`, `city`, `postal` | Every order. |
| `shipping_address.line1`, `city`, `postal` | Every order. |

Optional address fields: `company`, `attn`, `line2`, `state`, `country`, `phone`, `email`. Optional `customer.email` does not create a portal login. Optional `contact` is stored on the order and is not the account identity.

`shipping_priority` defaults to `GROUND`. Allowed values: `GROUND`, `THREE_DAY`, `TWO_DAY`, `TWO_DAY_AM`, `OVERNIGHT_AM`, `FIRST_OVERNIGHT`, `PRIORITY_OVERNIGHT`.

## Required product fields

Each order needs 1–100 lines. Each line needs `sku` and integer `quantity` of at least 1.

Optional, and used only as a conflict check when both sides have a value:

| Field | Rule |
| --- | --- |
| `product_name` | Shown to 360 staff. Never used to select a product. |
| `manufacturer` | Compared with the variant manufacturer when both are present. |
| `size` | Compared with the 360 size label when both are present. |
| `width_cm`, `length_cm` | Compared when both are present. |
| `unit_of_sale` | Must be `Units` when sent. |

Do not send a price. 360 prices the line.

## Customer identification

360 looks up `partner_account_ref` for the authenticated partner only.

- A mapping selects that 360 account and its existing discount and payment terms.
- A new reference creates one account when automatic creation and an approved pricing policy are on, and `customer.name` is present. The same reference on two simultaneous orders still creates one account.
- A new reference is rejected when automatic creation is off, the name is missing, or the approved discount or payment terms are missing.
- Clinics are not merged by similar names or addresses.
- A later order does not change the account name or pricing.
- No portal user or invitation is created. 360 staff can invite a user onto that account later.

## Product mapping

1. 360 looks up a verified mapping for this partner and the line SKU.
2. If none exists, an exact match to one active `product_variants.sku` is allowed only when that partner setting is on.
3. Pending, disabled, inactive, ambiguous, or conflicting lines are rejected.
4. Names are never used to choose a product. 360 does not substitute another product.

Send a catalog file to 360 before sandbox orders that use Nimble SKUs. One row per SKU:

- External SKU
- Product name
- Manufacturer
- Size
- Width and length, with the unit
- Packaging description
- Unit of sale

360 staff compare each row to a 360 variant and mark the mapping verified in Admin → Integrations. Orders that use an unverified SKU fail until that row is verified. Changing a mapping later does not change orders already placed.

## Pricing

360 applies the mapped account’s discount to the 360 base price. A newly created account receives the partner’s approved default discount and payment terms. An account without a discount and payment terms is not confirmed.

Shipping is not priced at intake. The invoice callback is sent only after freight is on the primary invoice and that invoice total equals the order total.

## Idempotency and retries

Send `Idempotency-Key` equal to `partner_order_number`. If the header is omitted, 360 uses `partner_order_number`. The header, when present, is 1–128 characters in the same character set as the order number.

Retry a timeout or HTTP 500 with the same key and the same JSON body. 360 returns the original order. The same order number or key with a different body returns HTTP 409 `conflict`. Do not change the body to force a new order. Use a new `partner_order_number`.

HTTP 422 and HTTP 409 for a business rejection should not be retried until the payload or the 360 configuration changes.

## Error responses

Order-submission failures include `error_code`. Authentication, rate limit, and validation responses include `error` and `request_id` and use the HTTP status below.

| HTTP | `error_code` | Meaning |
| --- | --- | --- |
| 401 | | Missing, invalid, revoked, inactive, or production key. |
| 403 | | Key cannot perform this action. |
| 409 | `conflict` | Same order number or idempotency key with a different body. |
| 409 | `ambiguous_sku` | SKU matches more than one active variant. |
| 409 | `product_metadata_conflict` | Manufacturer, size, or dimensions disagree with the 360 variant. |
| 422 | | Malformed body. JSON `error` is `The order payload is invalid.` and `details` lists fields. `error_code` is stored in the 360 request log as `validation` and is not in this JSON body. |
| 422 | `unknown_account` | Reference is not mapped and automatic creation is off. |
| 422 | `customer_name_required` | New reference without `customer.name`. |
| 422 | `pricing_not_approved` | Automatic creation is on and the partner has no approved discount or terms. |
| 422 | `pricing_not_configured` | The account has no discount or payment terms. |
| 422 | `unmapped_sku` | No verified mapping, and exact internal SKU matching is off. |
| 422 | `unverified_mapping` | A mapping exists and is not verified. |
| 422 | `disabled_mapping` | The mapping is disabled. |
| 422 | `inactive_product` | The variant or product is inactive. |
| 422 | `unknown_sku` | No verified mapping and no exact active internal SKU. |
| 422 | `unit_conflict` | `unit_of_sale` is not `Units`. |
| 422 | `insufficient_inventory` | On-hand quantity is short. No backorder is created. |
| 429 | | More than 60 requests in the last minute. |
| 500 | | Retry the identical request. |
| 503 | | Request log unavailable. Retry the identical request. |

Include `request_id` when asking 360 to trace a call.

## Callbacks 360 sends

360 calls `{callback_base_url}` with the outbound bearer token the partner issued and 360 saved. The callback host must be HTTPS. Paths are relative to that base:

| Event | Method and path | Body |
| --- | --- | --- |
| Invoice | `PATCH /api/integrations/v1/orders/{partner_order_number}/invoice` | `invoice_number`, `final_total` (dollars), `invoiced_at` |
| Shipment | `PATCH /api/integrations/v1/orders/{partner_order_number}/shipment` | `tracking_number`, `ship_via`, `shipped_at` |
| Payment link | `PATCH /api/integrations/v1/orders/{partner_order_number}/payment-link` | `payment_link_url` |
| Receipt | `PUT /api/integrations/v1/orders/{partner_order_number}/payments/{external_payment_id}` | `amount` (dollars), `payment_date` (`YYYY-MM-DD`), `payment_method`, `confirmation_code` |

`payment_method` is `credit_card`, `ach`, or `wire`. `external_payment_id` is the Stripe PaymentIntent id. `confirmation_code` is the charge id when Stripe provides one, otherwise the PaymentIntent id.

Return HTTP 200 when the payload is stored. Return 409 or 422 for a permanent rejection. 360 retries 401, 408, 429, 5xx, and network timeouts. Backoff starts at 30 seconds and increases through 2 minutes, 8 minutes, 30 minutes, 2 hours, 8 hours, and 24 hours, up to 8 attempts.

The payment-link and receipt calls wait until the invoice callback for that order has returned HTTP 200. The shipment call does not wait. A second tracking number for one order is not sent.

The payment link is a Stripe Checkout URL for the outstanding balance. After a partial payment, 360 sends a replacement URL for the remainder. Each capture is its own receipt PUT. The body never includes a card number, CVV, or bank account.

The invoice callback is sent only when the primary invoice is issued, fulfillment is closed, freight is included, and the invoice total equals the order total. A separate shipping-only invoice blocks that callback.

## Sandbox test sequence

1. Use the sandbox base URL and sandbox key from 360. Confirm `GET` of an unknown order number returns 404.
2. Submit a new `partner_account_ref` with `customer.name` and a verified SKU. Expect HTTP 200 and `CONFIRMED`.
3. Submit a second order number for the same reference. Expect the same clinic and the same discount.
4. Repeat the first request unchanged. Expect `idempotent_replay: true` and the same `order.id`.
5. Submit an unknown SKU. Expect 422 and no order.
6. After 360 fulfills and issues the invoice, accept the invoice PATCH, then the payment-link PATCH, then the shipment PATCH.
7. Open the Checkout URL in Stripe test mode, pay part of the balance, and accept the receipt PUT. Accept the replacement payment-link PATCH for the remainder, pay it, and accept the second receipt PUT.

360 staff fulfill from the portal. The sandbox does not buy a live shipping label.
