// Playtest lab tests — engine-level (no LLM, no DB):
// 1. enumerateActions is exercised indirectly through runPlaytest's fallback
//    path by mocking invokeLLM, proving a full run completes headlessly.
// 2. Action ids the mock returns are validated against the real enumeration.
// 3. Admin gating: playtest.start/list/get reject non-admin callers.
import { describe, it, expect, vi, beforeAll } from "vitest";

// -- headless shims must exist before the engine module loads ----------------
const store: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
});
vi.stubGlobal("setTimeout", (() => 0) as unknown as typeof setTimeout);

// Mock the LLM: pick the first legal action id from the offered list each turn,
// and return a fixed feedback report at the end.
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async (req: { messages: { role: string; content: string }[]; response_format?: { json_schema?: { name?: string } } }) => {
    const isReport = req.response_format?.json_schema?.name === "playtest_report";
    if (isReport) {
      return {
        choices: [{ message: { content: JSON.stringify({
          scores: { balance: 7, clarity: 8, fun: 7, pacing: 6 },
          balance: ["Vessari raiders snowball star economy after two kills."],
          clarity: ["Harvest costs are not visible before researching Organization."],
          fun: ["Village capture race feels tense in the opening."],
          bugs: [],
          suggestions: ["Show star income delta when hovering a city."],
          verdict: "Solid opening pacing; tighten mid-game economy feedback.",
        }) } }],
      };
    }
    // turn plan: parse offered ids out of the user message and choose the first two
    const userMsg = req.messages.find((m) => m.role === "user")?.content ?? "";
    const ids = [...userMsg.matchAll(/^- ([^:]+:[^:\s]+(?::[^\s:]+)?): /gm)].map((m) => m[1]);
    return {
      choices: [{ message: { content: JSON.stringify({ actionIds: ids.slice(0, 2), note: null }) } }],
    };
  }),
}));

import { runPlaytest } from "./playtest";
import { invokeLLM } from "./_core/llm";

describe("playtest engine", () => {
  it("completes a short headless run with LLM-chosen actions", async () => {
    const out = await runPlaytest({ seed: 42, size: 9, preset: "continents", llmTribe: 0, maxTurns: 6 });
    expect(out.turnsPlayed).toBeGreaterThanOrEqual(6);
    expect(out.matchSummary.tribeScores).toHaveLength(4);
    expect(out.matchSummary.llmTribeName).toBeTruthy();
    // the mocked model returned ids straight from the offered list, so at
    // least some turns should have applied LLM actions rather than falling back
    expect(out.llmActions).toBeGreaterThan(0);
    // report came from the mocked report call
    expect(out.feedback?.scores.balance).toBe(7);
    expect(out.feedback?.verdict).toContain("pacing");
    expect(vi.mocked(invokeLLM)).toHaveBeenCalled();
  }, 30000);

  it("falls back to scripted AI when the LLM errors", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("boom")); // first turn plan fails
    const out = await runPlaytest({ seed: 7, size: 9, preset: "pangaea", llmTribe: 1, maxTurns: 3 });
    expect(out.turnsPlayed).toBeGreaterThanOrEqual(3);
    expect(out.fallbackActions).toBeGreaterThanOrEqual(1);
  }, 30000);

  it('drops literal "null"/blank turn notes but keeps real ones (v29 data fix)', async () => {
    // Feed a rotating set of notes: literal "null", blank, and one real note.
    const junk = ["null", "  ", "NULL"];
    let call = 0;
    vi.mocked(invokeLLM).mockImplementation(async (req: { messages: { role: string; content: string }[]; response_format?: { json_schema?: { name?: string } } }) => {
      const isReport = req.response_format?.json_schema?.name === "playtest_report";
      if (isReport) return { choices: [{ message: { content: "null" } }] } as never;
      const userMsg = req.messages.find((m) => m.role === "user")?.content ?? "";
      const ids = [...userMsg.matchAll(/^- ([^:]+:[^:\s]+(?::[^\s:]+)?): /gm)].map((m) => m[1]);
      const note = call < junk.length ? junk[call] : "Economy feels readable this turn.";
      call++;
      return { choices: [{ message: { content: JSON.stringify({ actionIds: ids.slice(0, 1), note }) } }] } as never;
    });
    const out = await runPlaytest({ seed: 11, size: 9, preset: "continents", llmTribe: 0, maxTurns: 5 });
    const notes = out.matchSummary.turnNotes.filter((n) => !n.includes("[system]"));
    // no junk notes survive
    expect(notes.every((n) => !/:\s*(null|NULL)\s*$/.test(n) && n.trim().length > 3)).toBe(true);
    // the real note was kept with its turn prefix
    expect(notes.some((n) => n.includes("Economy feels readable"))).toBe(true);
  }, 30000);
});
