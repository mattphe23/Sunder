import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(
  new URL("../scripts/playtest-visual.mjs", import.meta.url),
  "utf8"
);
const start = source.indexOf("    let navigationTimer;");
const end = source.indexOf("    await configureVisualMode", start);
if (start < 0 || end <= start)
  throw new Error("CLI navigation deadline block missing");
// Execute the shipped CLI block, not a copy of its timer logic. All browser and
// timer inputs are controlled stubs; there are no navigation or HTTP requests.
const run = new Function(
  "page",
  "caseUrl",
  "spec",
  "NAVIGATION_CAP_MS",
  "CASE_CAP_MS",
  "setTimeout",
  "clearTimeout",
  `return (async () => { ${source.slice(start, end)} })();`
);

function fixture(goto: () => Promise<unknown>) {
  let fire: (() => void) | undefined;
  const token = {};
  const schedule = vi.fn((callback: () => void) => {
    fire = callback;
    return token;
  });
  const clear = vi.fn();
  const promise = run(
    { goto },
    () => "http://127.0.0.1/controlled-test",
    {},
    30_000,
    300_000,
    schedule,
    clear
  ) as Promise<void>;
  return { promise, schedule, clear, token, fire: () => fire?.() };
}

describe("visual playtester navigation deadline", () => {
  it("clears its timer after successful navigation", async () => {
    const f = fixture(() => Promise.resolve());
    await f.promise;
    expect(f.schedule).toHaveBeenCalledOnce();
    expect(f.clear).toHaveBeenCalledOnce();
    expect(f.clear).toHaveBeenCalledWith(f.token);
  });
  it("clears its timer when navigation fails", async () => {
    const f = fixture(() =>
      Promise.reject(new Error("controlled navigation failure"))
    );
    await expect(f.promise).rejects.toThrow("controlled navigation failure");
    expect(f.clear).toHaveBeenCalledOnce();
    expect(f.clear).toHaveBeenCalledWith(f.token);
  });
  it("retains the timeout failure and clears its handle", async () => {
    const f = fixture(() => new Promise(() => undefined));
    const rejected = expect(f.promise).rejects.toThrow(
      "Case navigation duration cap reached."
    );
    f.fire();
    await rejected;
    expect(f.clear).toHaveBeenCalledOnce();
    expect(f.clear).toHaveBeenCalledWith(f.token);
  });
});
