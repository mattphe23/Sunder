import { describe, expect, it } from "vitest";
import {
  DEFAULT_BETA_VISUALS,
  parseBetaVisualPreferences,
} from "../client/src/game/render/betaVisualPreferences";

describe("beta visual preferences", () => {
  it("starts both display options off without stored settings", () => {
    expect(parseBetaVisualPreferences(null)).toBe(DEFAULT_BETA_VISUALS);
    expect(DEFAULT_BETA_VISUALS).toEqual({
      newVisuals: false,
      landscape: false,
    });
  });
  it("fails closed for malformed, unversioned or future settings", () => {
    for (const raw of [
      "bad",
      "null",
      "true",
      "{}",
      '{"newVisuals":true}',
      '{"version":2,"newVisuals":true}',
    ]) {
      expect(parseBetaVisualPreferences(raw)).toBe(DEFAULT_BETA_VISUALS);
    }
  });
  it("requires exact booleans and keeps landscape independent", () => {
    expect(
      parseBetaVisualPreferences('{"version":1,"newVisuals":true}')
    ).toEqual({ newVisuals: true, landscape: false });
    expect(
      parseBetaVisualPreferences('{"version":1,"landscape":true}')
    ).toEqual({ newVisuals: false, landscape: true });
    expect(
      parseBetaVisualPreferences(
        '{"version":1,"newVisuals":"true","landscape":1}'
      )
    ).toEqual(DEFAULT_BETA_VISUALS);
  });
});
