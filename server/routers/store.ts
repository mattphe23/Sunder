// ── Sunder v27: store routes ─────────────────────────────────────────────────
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { PRODUCTS, productBySku } from "../../shared/products";
import { createCheckoutSession } from "../stripe";
import * as db from "../db";

export const storeRouter = router({
  /** Public catalog (from code, no DB). */
  catalog: publicProcedure.query(() => PRODUCTS),

  /** The signed-in user's entitlement keys + purchase history. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const [ents, purchases] = await Promise.all([
      db.getEntitlementKeys(ctx.user.id),
      db.getPurchases(ctx.user.id),
    ]);
    return { entitlements: ents, purchases };
  }),

  /** Start a Stripe Checkout for one SKU; returns the hosted URL. */
  checkout: protectedProcedure
    .input(z.object({ sku: z.string().min(1).max(64) }))
    .mutation(async ({ ctx, input }) => {
      const product = productBySku(input.sku);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Unknown product" });
      const owned = await db.getEntitlementKeys(ctx.user.id);
      if (product.grants.every((g) => owned.includes(g))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You already own this" });
      }
      const origin = (ctx.req.headers.origin as string) || `https://${ctx.req.headers.host}`;
      const url = await createCheckoutSession({
        sku: input.sku,
        userId: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        origin,
      });
      return { url };
    }),
});

