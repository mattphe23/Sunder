import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { PRODUCTS, productBySku, ultimateSavings, ALL_ENTITLEMENT_KEYS, RETIRED_ENTITLEMENT_KEYS } from "../shared/products";
import type { TrpcContext } from "./_core/context";

function ctxAnon(): TrpcContext {
  return { user: null, req: { headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("product catalog", () => {
  it("has unique SKUs and positive prices above Stripe's $0.50 minimum", () => {
    const skus = PRODUCTS.map((p) => p.sku);
    expect(new Set(skus).size).toBe(skus.length);
    for (const p of PRODUCTS) expect(p.priceCents).toBeGreaterThanOrEqual(50);
  });

  it("ultimate bundle grants every entitlement key", () => {
    const ultimate = productBySku("bundle_ultimate")!;
    expect([...ultimate.grants].sort()).toEqual([...ALL_ENTITLEMENT_KEYS].sort());
  });

  it("ultimate is cheaper than buying everything separately", () => {
    const { total, bundle } = ultimateSavings();
    expect(bundle).toBeLessThan(total);
  });

  it("every non-bundle grant key is granted by exactly one non-bundle product", () => {
    const seen = new Map<string, number>();
    for (const p of PRODUCTS.filter((p) => p.kind !== "bundle"))
      for (const g of p.grants) seen.set(g, (seen.get(g) ?? 0) + 1);
    for (const key of ALL_ENTITLEMENT_KEYS) {
      // Retired keys are deliberately granted by nothing — they exist so a
      // past purchase still resolves, not so it can be bought again.
      if (RETIRED_ENTITLEMENT_KEYS.includes(key)) {
        expect(seen.get(key)).toBeUndefined();
        continue;
      }
      expect(seen.get(key)).toBe(1);
    }
  });
});

describe("store router", () => {
  it("catalog is public", async () => {
    const caller = appRouter.createCaller(ctxAnon());
    const catalog = await caller.store.catalog();
    expect(catalog.length).toBe(PRODUCTS.length);
  });

  it("checkout rejects anonymous users", async () => {
    const caller = appRouter.createCaller(ctxAnon());
    await expect(caller.store.checkout({ sku: "bundle_ultimate" })).rejects.toMatchObject({
      message: expect.stringContaining("10001"),
    });
  });
});

describe("webhook fulfillment", () => {
  beforeEach(() => vi.resetModules());

  it("records purchase and fans out entitlements once (idempotent)", async () => {
    const granted: Array<{ userId: number; keys: string[] }> = [];
    const purchases: Array<{ sessionId: string }> = [];
    vi.doMock("./db", () => ({
      getPurchaseBySession: vi.fn(async (id: string) => purchases.find((p) => p.sessionId === id)),
      recordPurchase: vi.fn(async (p: { stripeSessionId: string }) => {
        purchases.push({ sessionId: p.stripeSessionId });
        return 42;
      }),
      grantEntitlements: vi.fn(async (userId: number, keys: string[]) => {
        granted.push({ userId, keys });
      }),
    }));
    const { fulfillCheckoutSession } = await import("./stripe");
    const session = {
      id: "cs_test_123",
      payment_intent: "pi_test_123",
      client_reference_id: "7",
      metadata: { sku: "story_ch1", user_id: "7" },
    } as never;
    await fulfillCheckoutSession(session);
    await fulfillCheckoutSession(session); // retry — must be a no-op
    expect(purchases.length).toBe(1);
    expect(granted.length).toBe(1);
    expect(granted[0]).toEqual({ userId: 7, keys: productBySku("story_ch1")!.grants });
  });

  it("ignores sessions with unknown SKUs without throwing", async () => {
    vi.doMock("./db", () => ({
      getPurchaseBySession: vi.fn(),
      recordPurchase: vi.fn(),
      grantEntitlements: vi.fn(),
    }));
    const { fulfillCheckoutSession } = await import("./stripe");
    await expect(
      fulfillCheckoutSession({ id: "cs_x", metadata: { sku: "nope", user_id: "1" } } as never),
    ).resolves.toBeUndefined();
  });
});
