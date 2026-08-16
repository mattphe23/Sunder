// ── Sunder v27: product catalog — single source of truth ────────────────────
// Code-defined catalog (no DB table): SKU ids, display copy, prices, and the
// entitlement keys each SKU grants. Stripe Checkout uses price_data built from
// this file, so there is nothing to sync in the Stripe dashboard.
//
// Entitlement keys are what gameplay checks. Bundles fan out to many keys.

export type ProductKind = "skin" | "tribe" | "maps" | "story" | "bundle";

export interface Product {
  sku: string;
  kind: ProductKind;
  name: string;
  tagline: string;
  /** price in USD cents */
  priceCents: number;
  /** entitlement keys granted on purchase */
  grants: string[];
  /** accent color for store cards */
  accent: string;
}

// ── Entitlement keys ─────────────────────────────────────────────────────────
export const ENT = {
  // tribe skins (Stage-2 rig costume variants)
  SKIN_AUREN_GILDED: "skin.auren.gilded",
  SKIN_KHARZUL_OBSIDIAN: "skin.kharzul.obsidian",
  SKIN_SUNWEI_JADE: "skin.sunwei.jade",
  SKIN_VESSARI_MIDNIGHT: "skin.vessari.midnight",
  SKIN_NERIVANE_ABYSSAL: "skin.nerivane.abyssal",
  SKIN_DRAVOK_MOLTEN: "skin.dravok.molten",
  // premium tribes
  TRIBE_VALKYRA: "tribe.valkyra",
  TRIBE_MYCELON: "tribe.mycelon",
  // premium map packs (AI-designed, curated)
  MAPS_FORGOTTEN_REALMS: "maps.pack1",
  MAPS_SHATTERED_SEAS: "maps.pack2",
  // story mode
  STORY_CH1: "story.ch1",
} as const;

export const ALL_ENTITLEMENT_KEYS: string[] = Object.values(ENT);

/**
 * Keys that were sold once and are not sold any more.
 *
 * They stay in ENT because a player who bought one still has the grant stored
 * against their account, and dropping the key would orphan it — the fulfilment
 * path matches on these strings. But nothing in the catalog grants them now, so
 * the "exactly one product grants each key" invariant has to know about them
 * rather than be quietly relaxed.
 *
 * The two tribes moved to the free roster; see docs/POLYTOPIA-COMPLAINTS.md §1.
 */
export const RETIRED_ENTITLEMENT_KEYS: string[] = [ENT.TRIBE_VALKYRA, ENT.TRIBE_MYCELON];

// ── Catalog ──────────────────────────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // — tribe skins ($1.99 each) —
  { sku: "skin_auren_gilded", kind: "skin", name: "Gilded Auren", tagline: "Scholars robed in sunlit gold and ivory.", priceCents: 199, grants: [ENT.SKIN_AUREN_GILDED], accent: "#eab308" },
  { sku: "skin_kharzul_obsidian", kind: "skin", name: "Obsidian Kharzul", tagline: "Forgeborn clad in black glass and ember.", priceCents: 199, grants: [ENT.SKIN_KHARZUL_OBSIDIAN], accent: "#525252" },
  { sku: "skin_sunwei_jade", kind: "skin", name: "Jade Sunwei", tagline: "Harvesters in imperial jade and cream.", priceCents: 199, grants: [ENT.SKIN_SUNWEI_JADE], accent: "#10b981" },
  { sku: "skin_vessari_midnight", kind: "skin", name: "Midnight Vessari", tagline: "Outriders wrapped in moonless violet.", priceCents: 199, grants: [ENT.SKIN_VESSARI_MIDNIGHT], accent: "#6d28d9" },
  { sku: "skin_nerivane_abyssal", kind: "skin", name: "Abyssal Nerivane", tagline: "Tideborn from the lightless deep.", priceCents: 199, grants: [ENT.SKIN_NERIVANE_ABYSSAL], accent: "#0e7490" },
  { sku: "skin_dravok_molten", kind: "skin", name: "Molten Dravok", tagline: "Stonebound veined with living magma.", priceCents: 199, grants: [ENT.SKIN_DRAVOK_MOLTEN], accent: "#ea580c" },
  // Valkyra and Mycelon used to sell here at $3.99. They are free now: their
  // perks are mechanical, not cosmetic — halved enemy retaliation changes the
  // arithmetic of every trade — and "selling tribes as DLC" is the single
  // loudest complaint in Polytopia's negative reviews, which is the audience
  // this game is aimed at. See docs/POLYTOPIA-COMPLAINTS.md §1. The money
  // stays where paying cannot win a match: skins, map packs and the campaign.
  //
  // Their entitlement keys survive in ENT so anyone who already bought one
  // keeps a valid grant and the Ultimate bundle's stored grants still resolve.
  // — map packs ($2.99 each) —
  { sku: "maps_forgotten_realms", kind: "maps", name: "Forgotten Realms Pack", tagline: "4 AI-forged maps: calderas, terraces, and lost valleys.", priceCents: 299, grants: [ENT.MAPS_FORGOTTEN_REALMS], accent: "#f59e0b" },
  { sku: "maps_shattered_seas", kind: "maps", name: "Shattered Seas Pack", tagline: "4 AI-forged maps: reefs, straits, and island fortresses.", priceCents: 299, grants: [ENT.MAPS_SHATTERED_SEAS], accent: "#22d3ee" },
  // — story mode ($4.99, whole campaign; Chapter II is a free content update) —
  { sku: "story_ch1", kind: "story", name: "Story Mode — The Sundering Saga", tagline: "Two chapters, 10 campaign missions — from the smallest shard to the reforged world.", priceCents: 499, grants: [ENT.STORY_CH1], accent: "#f43f5e" },
  // — ultimate ($14.99) —
  { sku: "bundle_ultimate", kind: "bundle", name: "Ultimate Pack", tagline: "Everything — all skins, tribes, maps, and Story Mode. Forever.", priceCents: 1499, grants: ALL_ENTITLEMENT_KEYS, accent: "#fbbf24" },
];

export const productBySku = (sku: string): Product | undefined => PRODUCTS.find((p) => p.sku === sku);

export const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/** Savings copy for the ultimate bundle. */
export const ultimateSavings = (): { total: number; bundle: number } => {
  const total = PRODUCTS.filter((p) => p.kind !== "bundle").reduce((n, p) => n + p.priceCents, 0);
  const bundle = productBySku("bundle_ultimate")!.priceCents;
  return { total, bundle };
};
