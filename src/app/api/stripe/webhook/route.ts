import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/server";
import { applySucceededPaymentIntentToInvoice } from "@/lib/stripe/applySucceededPaymentIntentToInvoice";
import { stripeCaptureWebhookStatus } from "@/lib/stripe/settleCapturedPayment";
import { syncStripePaymentSubmissionFromIntent } from "@/lib/stripe/syncStripePaymentSubmissionFromIntent";

export const runtime = "nodejs";

async function retrieveIntentForWebhook(intentOrId: Stripe.PaymentIntent | string) {
  try {
    const id = typeof intentOrId === "string" ? intentOrId : intentOrId.id;
    if (!id?.startsWith("pi_")) return null;
    return await stripe.paymentIntents.retrieve(id, { expand: ["payment_method"] });
  } catch (err) {
    console.error("[stripe webhook] retrieve intent failed", err);
    return null;
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ ok: false, error: "Missing Stripe signature or webhook secret." }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const full = (await retrieveIntentForWebhook(intent)) ?? intent;
      const result = await applySucceededPaymentIntentToInvoice(full);
      if (stripeCaptureWebhookStatus(result) === 500) {
        return NextResponse.json({ ok: false, error: "Payment was not recorded." }, { status: 500 });
      }
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentIntent = session.payment_intent;
      const paymentIntentId = typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
      if (paymentIntentId) {
        const full = await retrieveIntentForWebhook(paymentIntentId);
        if (full?.status === "succeeded") {
          const result = await applySucceededPaymentIntentToInvoice(full);
          if (stripeCaptureWebhookStatus(result) === 500) {
            return NextResponse.json({ ok: false, error: "Payment was not recorded." }, { status: 500 });
          }
        }
      }
    } else if (event.type === "payment_intent.processing") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const full = (await retrieveIntentForWebhook(intent)) ?? intent;
      await syncStripePaymentSubmissionFromIntent(full);
    } else if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
      const intent = event.data.object as Stripe.PaymentIntent;
      const full = (await retrieveIntentForWebhook(intent)) ?? intent;
      await syncStripePaymentSubmissionFromIntent(full);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return NextResponse.json({ ok: false, error: "Webhook handler failed." }, { status: 500 });
  }
}
