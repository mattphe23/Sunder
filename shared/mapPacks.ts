// Sunder — premium curated map packs. Each map is a hand-picked
// seed/preset/size combination that produces a distinctive, balanced board
// (verified in the AI playtest lab). Packs are store entitlements; the free
// game keeps its four random world types.

export interface CuratedMap {
  id: string;
  name: string;
  blurb: string;
  seed: number;
  preset: "continents" | "archipelago" | "highlands" | "pangaea";
  size: number;
}

export interface MapPack {
  key: string; // entitlement key ("maps.pack1" | "maps.pack2")
  name: string;
  maps: CuratedMap[];
}

export const MAP_PACKS: MapPack[] = [
  {
    key: "maps.pack1",
    // renamed from "Forgotten Realms" — that is WotC's D&D setting name and
    // cannot go on a paid product. Only the display name changes; the
    // entitlement key (and the product sku) keep the legacy identifier.
    name: "Lost Calderas",
    maps: [
      { id: "sunken-crown", name: "The Sunken Crown", blurb: "A drowned caldera — one ring of land around a deep inner sea.", seed: 90210, preset: "archipelago", size: 13 },
      { id: "titans-steps", name: "The Titan's Steps", blurb: "Terraced mountain shelves force long flanking marches.", seed: 41977, preset: "highlands", size: 11 },
      { id: "emerald-vein", name: "The Emerald Vein", blurb: "A single fertile valley snakes between two barren ranges.", seed: 73301, preset: "continents", size: 13 },
      { id: "ashen-crossroads", name: "The Ashen Crossroads", blurb: "Four homelands meet at one contested central plain.", seed: 15551, preset: "pangaea", size: 11 },
    ],
  },
  {
    key: "maps.pack2",
    name: "Shattered Seas",
    maps: [
      { id: "mirror-straits", name: "The Mirror Straits", blurb: "Twin continents split by a narrow, port-hungry channel.", seed: 60660, preset: "continents", size: 11 },
      { id: "thousand-isles", name: "The Thousand Isles", blurb: "A vast scatter of atolls — navies decide everything.", seed: 88422, preset: "archipelago", size: 13 },
      { id: "leviathans-rest", name: "The Leviathan's Rest", blurb: "One serpentine landmass coils through open ocean.", seed: 30317, preset: "pangaea", size: 13 },
      { id: "stormwatch", name: "Stormwatch", blurb: "High cliffs ring a storm-lashed inland sea.", seed: 52180, preset: "highlands", size: 13 },
    ],
  },
];

export const mapPackByKey = (key: string) => MAP_PACKS.find((p) => p.key === key);
