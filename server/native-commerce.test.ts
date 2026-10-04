import { describe, expect, it } from "vitest";
import { isIosNativeApp, webCheckoutAvailableOn } from "../client/src/lib/nativeCommerce";

describe("iOS smoke-build commerce guard", () => {
  it("disables web checkout only for the native iOS platform", () => {
    expect(webCheckoutAvailableOn("ios")).toBe(false);
    expect(webCheckoutAvailableOn("web")).toBe(true);
    expect(webCheckoutAvailableOn("android")).toBe(true);
  });

  it("does not classify a Node/web test process as native iOS", () => {
    expect(isIosNativeApp()).toBe(false);
  });
});
