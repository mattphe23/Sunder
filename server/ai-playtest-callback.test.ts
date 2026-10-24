import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../", import.meta.url));

describe("successful-build playtesting callback", () => {
  it("executes the exact workflow Python with mocked HTTP and fails closed outside scope", () => {
    const output = execFileSync(
      "python3",
      ["scripts/test-ai-playtest-callback.py"],
      { cwd: root, encoding: "utf8", timeout: 15_000, stdio: "pipe" }
    );
    expect(output).toContain("Report-only playtesting callback accepted");
  });
});
