// Polyforge map generation — seeded procedural island: radial falloff + value noise.
// Terrain: ocean/water/grass/forest/mountain; resources; villages; fair capital ring.

import { City, Tile, Terrain, VILLAGE_NAMES, idx, inBounds } from "./types";

/** Mulberry32 seeded PRNG */
export function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** simple value noise on a coarse grid, bilinear interpolated */
function makeNoise(rand: () => number, gridSize: number) {
  const g: number[] = [];
  for (let i = 0; i < (gridSize + 1) * (gridSize + 1); i++) g.push(rand());
  return (fx: number, fy: number) => {
    const gx = fx * gridSize;
    const gy = fy * gridSize;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = gx - x0, ty = gy - y0;
    const s = (x: number, y: number) => g[Math.min(y, gridSize) * (gridSize + 1) + Math.min(x, gridSize)];
    const a = s(x0, y0) * (1 - tx) + s(x0 + 1, y0) * tx;
    const b = s(x0, y0 + 1) * (1 - tx) + s(x0 + 1, y0 + 1) * tx;
    return a * (1 - ty) + b * ty;
  };
}

export interface MapResult {
  tiles: Tile[];
  cities: City[];
  capitals: { x: number; y: number }[]; // per tribe index order
}

export function generateMap(size: number, seed: number, tribeCount: number): MapResult {
  const rand = rng(seed);
  const elevNoise = makeNoise(rand, 4);
  const forestNoise = makeNoise(rand, 5);

  const tiles: Tile[] = [];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x / (size - 1);
      const fy = y / (size - 1);
      // radial falloff from center
      const dx = fx - 0.5, dy = fy - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy) / 0.7071;
      const elev = elevNoise(fx, fy) * 0.75 + 0.45 - dist * 0.72;
      let terrain: Terrain;
      if (elev < 0.12) terrain = "ocean";
      else if (elev < 0.22) terrain = "water";
      else if (elev > 0.62) terrain = "mountain";
      else terrain = forestNoise(fx, fy) > 0.58 ? "forest" : "grass";
      tiles.push({
        x, y, terrain, resource: null, cityId: null, ownerCityId: null,
        explored: new Array(tribeCount).fill(false), port: null, ruin: false, greatRuin: false,
      });
    }
  }

  // capital placement: pick land tiles on a ring, maximally spaced
  const landTiles = tiles.filter((t) => t.terrain === "grass" || t.terrain === "forest");
  const capitals: { x: number; y: number }[] = [];
  const cx = (size - 1) / 2, cy = (size - 1) / 2;
  for (let i = 0; i < tribeCount; i++) {
    const angle = (i / tribeCount) * Math.PI * 2 + 0.5;
    const tx = cx + Math.cos(angle) * size * 0.3;
    const ty = cy + Math.sin(angle) * size * 0.3;
    // nearest suitable land tile far enough from other capitals
    let best: Tile | null = null;
    let bestD = Infinity;
    for (const t of landTiles) {
      if (t.cityId !== null) continue;
      const d = (t.x - tx) ** 2 + (t.y - ty) ** 2;
      const minCapDist = Math.min(...capitals.map((c) => Math.abs(c.x - t.x) + Math.abs(c.y - t.y)), Infinity);
      if (capitals.length > 0 && minCapDist < Math.floor(size * 0.4)) continue;
      if (d < bestD) { bestD = d; best = t; }
    }
    if (!best) {
      // relax constraint
      for (const t of landTiles) {
        if (t.cityId !== null) continue;
        const d = (t.x - tx) ** 2 + (t.y - ty) ** 2;
        if (d < bestD) { bestD = d; best = t; }
      }
    }
    if (best) {
      best.terrain = "grass";
      capitals.push({ x: best.x, y: best.y });
    }
  }

  const cities: City[] = [];
  const nameBag = [...VILLAGE_NAMES];
  const takeName = () => nameBag.splice(Math.floor(rand() * nameBag.length), 1)[0] ?? "Vale";

  capitals.forEach((c, i) => {
    const city: City = { id: cities.length, x: c.x, y: c.y, name: takeName(), tribe: i, level: 1, population: 0, isCapital: true };
    cities.push(city);
    tiles[idx(c.x, c.y, size)].cityId = city.id;
  });

  // villages: spread across land, min manhattan distance 3 from any city
  const shuffled = [...landTiles].sort(() => rand() - 0.5);
  const targetVillages = Math.floor(size * size * 0.055);
  for (const t of shuffled) {
    if (cities.length - tribeCount >= targetVillages) break;
    if (t.cityId !== null) continue;
    const tooClose = cities.some((c) => Math.abs(c.x - t.x) + Math.abs(c.y - t.y) < 3);
    if (tooClose) continue;
    t.terrain = "grass";
    t.resource = null;
    const city: City = { id: cities.length, x: t.x, y: t.y, name: takeName(), tribe: null, level: 0, population: 0, isCapital: false };
    cities.push(city);
    t.cityId = city.id;
  }

  // resources: fruit on grass, animal on forest, mineral on mountain — biased near cities
  for (const t of tiles) {
    if (t.cityId !== null) continue;
    const nearCity = cities.some((c) => Math.abs(c.x - t.x) <= 1 && Math.abs(c.y - t.y) <= 1);
    const p = nearCity ? 0.5 : 0.12;
    if (t.terrain === "grass" && rand() < p) t.resource = "fruit";
    else if (t.terrain === "forest" && rand() < p) t.resource = "animal";
    else if (t.terrain === "mountain" && rand() < p * 0.8) t.resource = "mineral";
  }

  // ancient ruins: ~1 per 25 tiles on land, away from cities and other ruins
  const ruinTarget = Math.max(2, Math.floor((size * size) / 25));
  const ruinCandidates = [...landTiles].sort(() => rand() - 0.5);
  let placedRuins = 0;
  for (const t of ruinCandidates) {
    if (placedRuins >= ruinTarget) break;
    if (t.cityId !== null || t.resource !== null) continue;
    const nearCity = cities.some((c) => Math.abs(c.x - t.x) + Math.abs(c.y - t.y) < 3);
    if (nearCity) continue;
    const nearRuin = tiles.some((q) => q.ruin && Math.abs(q.x - t.x) + Math.abs(q.y - t.y) < 4);
    if (nearRuin) continue;
    t.ruin = true;
    placedRuins++;
  }

  // great ruins: 1 per map (2 on 13×13+), on land, far from ALL capitals and normal ruins
  const greatTarget = size >= 13 ? 2 : 1;
  const greatCandidates = [...landTiles]
    .filter((t) => t.cityId === null && !t.ruin && t.resource === null)
    .map((t) => ({
      t,
      minCapDist: Math.min(...capitals.map((c) => Math.abs(c.x - t.x) + Math.abs(c.y - t.y))),
    }))
    .filter((e) => e.minCapDist >= Math.floor(size * 0.35))
    .sort((a, b) => b.minCapDist - a.minCapDist);
  let placedGreat = 0;
  for (const e of greatCandidates) {
    if (placedGreat >= greatTarget) break;
    const nearOther = tiles.some((q) => q.greatRuin && Math.abs(q.x - e.t.x) + Math.abs(q.y - e.t.y) < 6);
    if (nearOther) continue;
    e.t.greatRuin = true;
    e.t.terrain = "grass"; // ensure reachable
    placedGreat++;
  }
  // fallback: if none matched the distance filter, take the farthest available land tile
  if (placedGreat === 0) {
    const fallback = [...landTiles]
      .filter((t) => t.cityId === null && !t.ruin)
      .sort((a, b) => {
        const da = Math.min(...capitals.map((c) => Math.abs(c.x - a.x) + Math.abs(c.y - a.y)));
        const db = Math.min(...capitals.map((c) => Math.abs(c.x - b.x) + Math.abs(c.y - b.y)));
        return db - da;
      })[0];
    if (fallback) { fallback.greatRuin = true; fallback.terrain = "grass"; }
  }

  // claim borders around owned capitals
  for (const city of cities) {
    if (city.tribe === null) continue;
    claimBorders(tiles, size, city);
  }

  return { tiles, cities, capitals };
}

export function claimBorders(tiles: Tile[], size: number, city: City) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = city.x + dx, y = city.y + dy;
      if (!inBounds(x, y, size)) continue;
      const t = tiles[idx(x, y, size)];
      if (t.ownerCityId === null) t.ownerCityId = city.id;
    }
  }
}
