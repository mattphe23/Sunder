import { describe, expect, it } from "vitest";
import {
  COMPACT_SELECTION_OVERLAY_STYLE,
  DEFAULT_SELECTION_OVERLAY_STYLE,
  selectionOverlayStyle,
} from "../client/src/game/render/selectionOverlayStyle";

describe("selection overlay style", () => {
  it("keeps the existing sigil parameters exactly when both beta display preferences are off", () => {
    expect(selectionOverlayStyle({ newVisuals: false, landscape: false })).toBe(
      DEFAULT_SELECTION_OVERLAY_STYLE
    );
    expect(DEFAULT_SELECTION_OVERLAY_STYLE).toEqual({
      compact: false,
      sigilScale: 1,
      sigilOpacity: 1,
    });
  });

  it.each([
    { newVisuals: true, landscape: false },
    { newVisuals: false, landscape: true },
    { newVisuals: true, landscape: true },
  ])(
    "uses the compact, quieter existing sigil only after explicit opt-in: %o",
    preferences => {
      const style = selectionOverlayStyle(preferences);
      expect(style).toBe(COMPACT_SELECTION_OVERLAY_STYLE);
      expect(style.compact).toBe(true);
      expect(style.sigilScale).toBeLessThan(1);
      expect(style.sigilOpacity).toBeLessThan(1);
    }
  );
});
