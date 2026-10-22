import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function store(restricted = false) {
  vi.resetModules();
  const values = new Map<string, string>([
    ["polyforge-save-v1", "immutable-save"],
  ]);
  const events = new Map<
    string,
    (event: { key: string | null; newValue: string | null }) => void
  >();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => {
        if (restricted) throw new Error("restricted");
        return values.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        if (restricted) throw new Error("restricted");
        values.set(key, value);
      },
    },
    addEventListener: (
      name: string,
      listener: (event: { key: string | null; newValue: string | null }) => void
    ) => events.set(name, listener),
    removeEventListener: (name: string) => events.delete(name),
  });
  return {
    module: await import("../client/src/game/render/betaVisualPreferences"),
    values,
    events,
  };
}

describe("beta preference store isolation", () => {
  it("broadcasts reversible settings and persists only its own versioned key", async () => {
    const { module: preferences, values, events } = await store();
    expect(preferences.getBetaVisualPreferences()).toEqual({
      newVisuals: false,
      landscape: false,
    });
    const listener = vi.fn();
    const unsubscribe = preferences.subscribeBetaVisualPreferences(listener);
    preferences.setBetaVisualPreferences({ newVisuals: true });
    expect(preferences.getBetaVisualPreferences()).toEqual({
      newVisuals: true,
      landscape: false,
    });
    expect(
      JSON.parse(values.get(preferences.BETA_VISUAL_PREFERENCE_KEY)!)
    ).toEqual({ version: 1, newVisuals: true, landscape: false });
    preferences.setBetaVisualPreferences({
      newVisuals: false,
      landscape: true,
    });
    expect(preferences.getBetaVisualPreferences()).toEqual({
      newVisuals: false,
      landscape: true,
    });
    expect(values.get("polyforge-save-v1")).toBe("immutable-save");
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(events.size).toBe(0);
  });
  it("fails closed on cross-tab malformed/future changes and clear", async () => {
    const { module: preferences, events } = await store();
    const unsubscribe = preferences.subscribeBetaVisualPreferences(() => {});
    preferences.setBetaVisualPreferences({ newVisuals: true, landscape: true });
    events.get("storage")?.({
      key: preferences.BETA_VISUAL_PREFERENCE_KEY,
      newValue: '{"version":2,"newVisuals":true}',
    });
    expect(preferences.getBetaVisualPreferences()).toEqual({
      newVisuals: false,
      landscape: false,
    });
    preferences.setBetaVisualPreferences({ newVisuals: true });
    events.get("storage")?.({ key: null, newValue: null });
    expect(preferences.getBetaVisualPreferences()).toEqual({
      newVisuals: false,
      landscape: false,
    });
    unsubscribe();
  });
  it("keeps restricted-storage sessions off initially and still permits rollback", async () => {
    const { module: preferences } = await store(true);
    expect(preferences.getBetaVisualPreferences()).toEqual({
      newVisuals: false,
      landscape: false,
    });
    preferences.setBetaVisualPreferences({ newVisuals: true });
    expect(preferences.getBetaVisualPreferences().newVisuals).toBe(true);
    preferences.setBetaVisualPreferences({ newVisuals: false });
    expect(preferences.getBetaVisualPreferences().newVisuals).toBe(false);
  });
});
