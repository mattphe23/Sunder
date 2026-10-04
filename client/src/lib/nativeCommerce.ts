import { Capacitor } from "@capacitor/core";

/** The smoke build never starts a web checkout inside the native iOS app.
 * Existing entitlements still load normally; web/Android store behavior is unchanged.
 * Use the native bridge, not user-agent text or a query parameter. */
export function webCheckoutAvailableOn(platform: string): boolean {
  return platform !== "ios";
}

export function isIosNativeApp(): boolean {
  return Capacitor.isNativePlatform() && !webCheckoutAvailableOn(Capacitor.getPlatform());
}
