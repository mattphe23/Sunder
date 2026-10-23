import { beforeEach, describe, expect, it, vi } from "vitest";

const storage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);
import { game } from "../client/src/game/core/state";
import { tileAt, harvestCost } from "../client/src/game/core/rules";
import { resourceAction } from "../client/src/game/ui/resourceAction";
import type { Tile } from "../client/src/game/core/types";

function fresh() {
  game.newGame({
    size: 11,
    seed: 42,
    difficulty: "normal",
    preset: "pangaea",
    humanTribe: 0,
  });
  const s = game.state;
  s.currentTribe = s.humanTribe;
  s.aiThinking = false;
  s.showIntro = false;
  s.pendingCityReward = null;
  s.pendingPerk = null;
  const city = s.cities.find(c => c.tribe === s.humanTribe)!;
  const tile = s.tiles.find(
    t => t.ownerCityId === city.id && t.cityId === null
  )!;
  tile.resource = "fruit";
  tile.explored[s.humanTribe] = true;
  s.tribes[s.humanTribe].techs.push("organization", "hunting", "mining");
  s.tribes[s.humanTribe].stars = 10;
  city.population = 0;
  return { s, city, tile };
}

const resources = [
  ["fruit", "Harvest fruit", "organization"],
  ["animal", "Hunt animals", "hunting"],
  ["mineral", "Mine minerals", "mining"],
] as const;

describe("read-only resource inspection", () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) delete storage[key];
  });
  it.each(resources)(
    "offers the existing %s action without spending or mutating the save",
    (resource, label, tech) => {
      const { s, city, tile } = fresh();
      tile.resource = resource;
      const before = JSON.stringify(s);
      const save = { ...storage };
      const action = resourceAction(s, tile);
      expect(action).toMatchObject({
        label,
        requiredTech: tech,
        enabled: true,
        reason: null,
        cost: harvestCost(s, s.humanTribe),
        cityName: city.name,
      });
      expect(JSON.stringify(s)).toBe(before);
      expect(storage).toEqual(save);
    }
  );
  it.each(resources)(
    "explains the missing technology for %s",
    (resource, _label, tech) => {
      const { s, tile } = fresh();
      tile.resource = resource;
      s.tribes[s.humanTribe].techs = s.tribes[s.humanTribe].techs.filter(
        t => t !== tech
      );
      expect(resourceAction(s, tile)).toMatchObject({
        enabled: false,
        requiredTech: tech,
      });
      expect(resourceAction(s, tile)?.reason).toMatch(/^Research /);
    }
  );
  it("explains ownership for neutral and enemy territory", () => {
    const { s, tile } = fresh();
    const cityId = tile.ownerCityId!;
    for (const owner of [
      null,
      s.cities.find(c => c.tribe !== null && c.tribe !== s.humanTribe)!.id,
    ]) {
      tile.ownerCityId = owner;
      expect(resourceAction(s, tile)).toMatchObject({
        enabled: false,
        cityName: null,
        reason: "This resource must be inside a city you own.",
      });
    }
    tile.ownerCityId = cityId;
  });
  it("explains star shortage, preserving Sunwei's existing one-star discount", () => {
    const { s, tile } = fresh();
    const me = s.tribes[s.humanTribe];
    me.stars = 0;
    expect(resourceAction(s, tile)).toMatchObject({
      cost: 2,
      enabled: false,
      reason: "You need 2 stars; you have 0.",
    });
    me.passive = "harvesters";
    expect(resourceAction(s, tile)).toMatchObject({ cost: 1, enabled: false });
    me.stars = 1;
    expect(resourceAction(s, tile)).toMatchObject({ cost: 1, enabled: true });
  });
  it("disables confirmation outside the player's turn and during reward choices", () => {
    const { s, city, tile } = fresh();
    s.currentTribe = (s.humanTribe + 1) % s.tribes.length;
    expect(resourceAction(s, tile)).toMatchObject({
      enabled: false,
      reason: "Wait for your turn.",
    });
    s.currentTribe = s.humanTribe;
    s.aiThinking = true;
    expect(resourceAction(s, tile)?.enabled).toBe(false);
    s.aiThinking = false;
    s.pendingCityReward = city.id;
    expect(resourceAction(s, tile)?.reason).toBe(
      "Finish the pending reward choice first."
    );
    s.pendingCityReward = null;
    s.phase = "gameover";
    expect(resourceAction(s, tile)?.enabled).toBe(false);
  });
  it("fails closed for unseen, out-of-current-vision, exhausted and invalid tiles", () => {
    const { s, tile } = fresh();
    for (const p of [
      { x: -1, y: 0 },
      { x: s.size, y: 0 },
      { x: 0.5, y: 0 },
      { x: NaN, y: 0 },
    ])
      expect(resourceAction(s, p)).toBeNull();
    tile.explored[s.humanTribe] = false;
    expect(resourceAction(s, tile)).toBeNull();
    tile.explored[s.humanTribe] = true;
    s.cities = [];
    s.units = [];
    expect(resourceAction(s, tile)).toBeNull();
    const next = fresh();
    next.tile.resource = null;
    expect(resourceAction(next.s, next.tile)).toBeNull();
  });
});

describe("explicit confirmation uses unchanged harvest mechanics", () => {
  it.each(resources)(
    "collects %s once, charges its existing cost and adds one city population",
    resource => {
      const { s, city, tile } = fresh();
      tile.resource = resource;
      const unitsBefore = JSON.stringify(s.units);
      const turnBefore = s.turn;
      const cost = harvestCost(s, s.humanTribe);
      expect(resourceAction(s, tile)?.enabled).toBe(true);
      game.harvest(tile.x, tile.y);
      expect(tileAt(s, tile.x, tile.y).resource).toBeNull();
      expect(s.tribes[s.humanTribe].stars).toBe(10 - cost);
      expect(city.population).toBe(1);
      expect(JSON.stringify(s.units)).toBe(unitsBefore);
      expect(s.turn).toBe(turnBefore);
      expect(resourceAction(s, tile)).toBeNull();
      game.harvest(tile.x, tile.y);
      expect(s.tribes[s.humanTribe].stars).toBe(10 - cost);
      expect(city.population).toBe(1);
    }
  );
  it("retains the existing city level-up reward flow", () => {
    const { s, city, tile } = fresh();
    city.population = 2;
    const before = city.level;
    game.harvest(tile.x, tile.y);
    expect(city.level).toBe(before + 1);
    expect(city.population).toBe(0);
    expect(s.pendingCityReward).toBe(city.id);
  });
});
