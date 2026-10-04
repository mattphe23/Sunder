import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import capacitorConfig from "../capacitor.config";

const xcodeProject = readFileSync(new URL("../ios/App/App.xcodeproj/project.pbxproj", import.meta.url), "utf8");
const infoPlist = readFileSync(new URL("../ios/App/App/Info.plist", import.meta.url), "utf8");

describe("iOS distribution identity", () => {
  it("uses the owner-selected explicit bundle identifier in Capacitor and both Xcode targets", () => {
    expect(capacitorConfig.appId).toBe("com.islandroadco.sunder");

    const bundleIds = [...xcodeProject.matchAll(/PRODUCT_BUNDLE_IDENTIFIER\s*=\s*([^;]+);/g)].map(
      ([, value]) => value.trim(),
    );
    expect(bundleIds).toEqual([capacitorConfig.appId, capacitorConfig.appId]);
    expect(xcodeProject).not.toContain("com.sunder.livingforge");
  });

  it("lets the app's Info.plist resolve the identifier from its Xcode build setting", () => {
    expect(infoPlist).toMatch(/<key>CFBundleIdentifier<\/key>\s*<string>\$\(PRODUCT_BUNDLE_IDENTIFIER\)<\/string>/);
  });
});
