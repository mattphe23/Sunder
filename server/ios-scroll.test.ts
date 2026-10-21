import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import capacitorConfig from "../capacitor.config";

const home = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const canvas = readFileSync(new URL("../client/src/game/GameCanvas.tsx", import.meta.url), "utf8");

describe("native iOS page scrolling", () => {
  it("allows WKWebView document scrolling so the tall setup menu is reachable", () => {
    // Capacitor maps this to WKWebView.scrollView.isScrollEnabled. A desktop
    // browser smoke test cannot emulate this native property.
    expect(capacitorConfig.ios?.scrollEnabled).toBe(true);
  });

  it("keeps gameplay fixed to the viewport and reserves canvas gestures for Babylon", () => {
    expect(home).toContain('if (s.phase === "menu") return <MainMenu />;');
    expect(home).toContain('className="relative h-screen w-screen overflow-hidden');
    expect(canvas).toContain('touchAction: "none"');
  });
});
