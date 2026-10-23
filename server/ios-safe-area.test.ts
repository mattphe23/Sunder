import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import postcss from "postcss";

const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const root = postcss.parse(css);
const guardSelectors = [
  ".safe-t",
  ".safe-b",
  ".safe-x",
  ".safe-t-offset",
  ".safe-b-offset",
  ".safe-r-offset",
];

function declarations(selector: string) {
  const matches: postcss.Rule[] = [];
  root.walkRules(selector, (rule) => { matches.push(rule); });
  expect(matches).toHaveLength(1);
  const rule = matches[0];
  expect(rule.parent?.type).toBe("root");
  const values: Record<string, string> = {};
  rule.walkDecls((decl) => { values[decl.prop] = decl.value; });
  return values;
}

describe("iOS full-bleed safe-area guards", () => {
  it("keeps every guard unlayered so p-3/right-3 cannot override native insets", () => {
    for (const selector of guardSelectors) declarations(selector);
  });

  it("uses native top/bottom insets with the existing padding floor and zero fallback", () => {
    expect(declarations(".safe-t")["padding-top"]).toBe("max(0.75rem, env(safe-area-inset-top, 0px))");
    expect(declarations(".safe-b")["padding-bottom"]).toBe("max(0.75rem, env(safe-area-inset-bottom, 0px))");
  });

  it("protects both landscape edges and the right-anchored minimap", () => {
    const sides = declarations(".safe-x");
    expect(sides["padding-left"]).toBe("max(0.75rem, env(safe-area-inset-left, 0px))");
    expect(sides["padding-right"]).toBe("max(0.75rem, env(safe-area-inset-right, 0px))");
    expect(declarations(".safe-r-offset").right).toBe(sides["padding-right"]);
    const minimap = readFileSync(new URL("../client/src/game/ui/Minimap.tsx", import.meta.url), "utf8");
    expect(minimap).toContain("safe-t-offset safe-r-offset");
  });

  it("anchors the minimap below the same top padding floor plus 44px controls and 8px gap", () => {
    expect(declarations(".safe-t-offset").top).toBe("calc(max(0.75rem, env(safe-area-inset-top, 0px)) + 3.25rem)");
    expect(declarations(".safe-b-offset").bottom).toBe("calc(4rem + env(safe-area-inset-bottom, 0px))");
  });

  it("retains full-bleed layout and the validated native start-menu scrolling setting", () => {
    const native = readFileSync(new URL("../capacitor.config.ts", import.meta.url), "utf8");
    const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
    expect(native).toMatch(/contentInset:\s*"never"/);
    expect(native).toMatch(/scrollEnabled:\s*true/);
    expect(html).toContain("viewport-fit=cover");
  });
});
