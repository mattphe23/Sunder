// Sunder — v19 global challenge leaderboard.
// LeaderboardSubmit: invisible hook that posts a finished daily/weekly run's
// score (signed-in players only; server keeps the best per period).
// LeaderboardPanel: menu panel with Daily/Weekly tabs, top-50 board, your rank.
import { useEffect, useRef, useState } from "react";
import { Crown, Globe2, Loader2, Medal } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { dailyChallenge, weeklyChallenge, ChallengeKind } from "../core/challenges";
import { loadProfile } from "../core/profile";

/** Server-side period key, e.g. "daily:2026-07-23" / "weekly:2026-W30". */
export function challengeKeyFor(kind: ChallengeKind): string {
  const setup = kind === "daily" ? dailyChallenge() : weeklyChallenge();
  return `${kind}:${setup.key}`;
}

/** Mounted on the game-over screen: submits a challenge run once, when signed in. */
export function LeaderboardSubmit(props: { kind: ChallengeKind; score: number; won: boolean; turns: number }) {
  const { isAuthenticated } = useAuth();
  const submit = trpc.leaderboard.submit.useMutation();
  const sent = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || sent.current) return;
    sent.current = true;
    submit.mutate({
      challengeKey: challengeKeyFor(props.kind),
      commanderName: loadProfile().name || "Commander",
      score: props.score,
      won: props.won,
      turns: props.turns,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  return null;
}

/** Collapsible menu panel showing the global boards. */
export function LeaderboardPanel() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ChallengeKind>("daily");
  const { isAuthenticated } = useAuth();
  const key = challengeKeyFor(kind);
  const { data, isLoading } = trpc.leaderboard.top.useQuery({ challengeKey: key }, { enabled: open });

  const setup = kind === "daily" ? dailyChallenge() : weeklyChallenge();

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors hover:bg-white/10"
      >
        <Globe2 className="h-3.5 w-3.5 text-cyan-300" /> Global Leaderboard
        <span className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <div className="mt-2 rounded-md border border-white/10 bg-[#10102c] p-3">
          <div className="mb-2 flex gap-1.5">
            {(["daily", "weekly"] as const).map(k => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                  kind === k ? "bg-cyan-400/20 text-cyan-300 border border-cyan-400/40" : "border border-white/10 text-slate-400 hover:bg-white/5"
                }`}
              >
                {k}
              </button>
            ))}
            <span className="ml-auto self-center text-[10px] text-slate-500">{setup.label} · resets in {setup.resetsIn}</span>
          </div>

          {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-slate-500" /></div>}

          {!isLoading && data && data.top.length === 0 && (
            <p className="py-3 text-center text-[11px] text-slate-500">
              No scores yet this period — finish the {kind} challenge while signed in to claim first place.
            </p>
          )}

          {!isLoading && data && data.top.length > 0 && (
            <div className="max-h-56 space-y-0.5 overflow-y-auto pr-1">
              {data.top.map(row => (
                <div
                  key={row.rank}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${row.you ? "bg-cyan-400/10 text-cyan-200" : "text-slate-300"}`}
                >
                  <span className="w-6 shrink-0 text-right font-mono font-bold text-slate-500">
                    {row.rank === 1 ? <Crown className="ml-auto h-3.5 w-3.5 text-amber-400" /> : row.rank}
                  </span>
                  <span className="flex-1 truncate font-semibold">{row.commanderName}{row.you ? " (you)" : ""}</span>
                  {row.won && <Medal className="h-3 w-3 shrink-0 text-emerald-400" />}
                  <span className="shrink-0 font-mono font-bold text-amber-300">{row.score}</span>
                </div>
              ))}
            </div>
          )}

          {data?.me && (
            <p className="mt-2 border-t border-white/10 pt-2 text-center text-[11px] text-slate-400">
              Your rank: <span className="font-bold text-cyan-300">#{data.me.rank}</span> with{" "}
              <span className="font-bold text-amber-300">{data.me.score}</span>
            </p>
          )}

          {!isAuthenticated && (
            <p className="mt-2 border-t border-white/10 pt-2 text-center text-[11px] text-slate-500">
              <button onClick={() => startLogin()} className="font-bold text-cyan-300 underline-offset-2 hover:underline">Sign in</button>{" "}
              to post your scores and claim a rank.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
