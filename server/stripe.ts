// ── Sunder v27: Stripe integration ───────────────────────────────────────────
// Checkout session creation + webhook fulfillment. The product catalog lives in
// shared/products.ts; Checkout uses inline price_data so no dashboard sync.
import Stripe from "stripe";
import type express from "express";
import { productBySku } from "../shared/products";
import * as db from "./db";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-06-30.basil" as Stripe.LatestApiVersion,
});

/** Create a Checkout Session for one SKU. Returns the hosted checkout URL. */
export async function createCheckoutSession(opts: {
  sku: string;
  userId: number;
  email: string | null;
  name: string | null;
  origin: string;
}): Promise<string> {
  const product = productBySku(opts.sku);
  if (!product) throw new Error(`Unknown SKU: ${opts.sku}`);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    allow_promotion_codes: true,
    customer_email: opts.email ?? undefined,
    client_reference_id: String(opts.userId),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: product.priceCents,
          product_data: { name: product.name, description: product.tagline },
        },
      },
    ],
    metadata: {
      sku: product.sku,
      user_id: String(opts.userId),
      customer_email: opts.email ?? "",
      customer_name: opts.name ?? "",
    },
    success_url: `${opts.origin}/store?purchase=success&sku=${product.sku}`,
    cancel_url: `${opts.origin}/store?purchase=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** Fulfill a completed checkout: record purchase + fan out entitlements. Idempotent per session. */
export async function fulfillCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const sku = session.metadata?.sku;
  const userId = Number(session.metadata?.user_id ?? session.client_reference_id);
  if (!sku || !userId || Number.isNaN(userId)) {
    console.warn("[Stripe] checkout.session.completed missing sku/user metadata", session.id);
    return;
  }
  const product = productBySku(sku);
  if (!product) {
    console.warn("[Stripe] Unknown SKU in completed session", sku);
    return;
  }
  const already = await db.getPurchaseBySession(session.id);
  if (already) return; // idempotent — webhook retries are safe
  const purchaseId = await db.recordPurchase({
    userId,
    sku,
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null),
  });
  await db.grantEntitlements(userId, product.grants, purchaseId);
  console.log(`[Stripe] Fulfilled ${sku} for user ${userId} (${product.grants.length} entitlements)`);
}

/** Express route: must be mounted with express.raw BEFORE express.json. */
export function registerStripeWebhook(app: express.Express, rawParser: express.RequestHandler): void {
  app.post("/api/stripe/webhook", rawParser, async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET ?? "");
    } catch (err) {
      console.error("[Stripe] Webhook signature verification failed:", (err as Error).message);
      res.status(400).send("Webhook signature verification failed");
      return;
    }

    // Platform test events must return { verified: true }
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        await fulfillCheckoutSession(event.data.object as Stripe.Checkout.Session);
      } else {
        console.log(`[Stripe] Ignoring event ${event.type} (${event.id})`);
      }
      res.json({ received: true });
    } catch (err) {
      console.error("[Stripe] Webhook handler error:", err);
      res.status(500).send("Webhook handler error");
    }
  });
}
