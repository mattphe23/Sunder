// v18 — async multiplayer controller. Mounted in Home whenever state.online is set.
// Reuses the hot-seat hand-off mechanism: when the REMOTE player's turn begins,
// we upload our snapshot and wait; when it's OUR turn we simply dismiss the hand-off.
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/useGame";
import { game } from "@/game/core/state";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function OnlineGame() {
  const g = useGame();
  const s = g.state;
  const online = s.online;
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const submitTurn = trpc.match.submitTurn.useMutation();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittedFor = useRef<number>(-1); // last turn number we submitted
  const finishedSent = useRef(false);

  // Which tribe do I control? Host plays hostTribe, guest plays guestTribe.
  const { data: matchData } = trpc.match.get.useQuery(
    { matchId: online?.matchId ?? "" },
    { enabled: !!online, refetchOnWindowFocus: false },
  );
  const matchInfo = matchData?.match;
  const myTribe = matchInfo && user
    ? (matchInfo.hostUserId === user.id ? online!.hostTribe : online!.guestTribe)
    : null;

  // Poll match status while waiting for the opponent.
  const { data: status } = trpc.match.status.useQuery(
    { matchId: online?.matchId ?? "" },
    { enabled: !!online && waiting, refetchInterval: 5000, refetchOnWindowFocus: true },
  );

  // 1) Hand-off arbitration: our turn → dismiss; remote turn → submit + wait.
  useEffect(() => {
    if (!online || myTribe === null || s.phase !== "playing") return;
    if (s.handoff === null || s.handoff === undefined) return;
    if (s.handoff === myTribe) {
      game.confirmHandoff();
      setWaiting(false);
      return;
    }
    // Remote player's turn began locally — upload the snapshot once per game turn.
    const localTurn = s.turn * 10 + s.currentTribe; // unique per (turn, tribe)
    if (submittedFor.current === localTurn) return;
    submittedFor.current = localTurn;
    setWaiting(true);
    submitTurn.mutate(
      { matchId: online.matchId, turnNumber: (matchInfo?.turnNumber ?? 0) + 1, state: game.serializeState() },
      {
        onError: e => setError(e.message),
        onSuccess: () => utils.match.status.invalidate({ matchId: online.matchId }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online?.matchId, myTribe, s.handoff, s.phase, s.turn, s.currentTribe]);

  // 2) While waiting: when the server turn advances back to us, pull the snapshot.
  useEffect(() => {
    if (!online || !waiting || !status || !user) return;
    if (status.status === "finished" || status.status === "abandoned") {
      // opponent finished the game (or conceded) — pull final state
      utils.match.get.fetch({ matchId: online.matchId }).then(m => {
        if (m?.state && myTribe !== null) {
          game.loadOnlineSnapshot(m.state, myTribe);
        }
        setWaiting(false);
      });
      return;
    }
    if (status.currentUserId === user.id && status.turnNumber > (matchInfo?.turnNumber ?? 0)) {
      utils.match.get.fetch({ matchId: online.matchId }).then(m => {
        if (m?.state && myTribe !== null && game.loadOnlineSnapshot(m.state, myTribe)) {
          utils.match.get.invalidate({ matchId: online.matchId });
          setWaiting(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, waiting, online?.matchId, user?.id, myTribe]);

  // 3) Game over during MY play → report the result to the server once.
  useEffect(() => {
    if (!online || s.phase !== "gameover" || finishedSent.current || myTribe === null) return;
    finishedSent.current = true;
    const iWon = s.winner === myTribe;
    const winnerName = s.winner !== null ? (s.tribes[s.winner]?.name ?? "Nobody") : "Nobody";
    submitTurn.mutate({
      matchId: online.matchId,
      turnNumber: (matchInfo?.turnNumber ?? 0) + 1,
      state: game.serializeState(),
      finished: true,
      winner: iWon ? "me" : "opponent",
      resultText: `${winnerName} rules the Shatterlands`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.phase, online?.matchId, myTribe]);

  if (!online) return null;
  const oppName = matchInfo && user
    ? (matchInfo.hostUserId === user.id ? (online.guestName || "your rival") : online.hostName)
    : "your rival";

  return (
    <>
      {waiting && s.phase === "playing" && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="mx-4 max-w-sm rounded-2xl border border-amber-400/30 bg-[#1a1a3e] p-8 text-center shadow-2xl">
            <div className="mb-3 text-4xl">⏳</div>
            <h2 className="mb-2 text-xl font-bold text-amber-100">Waiting for {oppName}</h2>
            <p className="mb-4 text-sm text-slate-300">
              Your turn has been forged into the record. You can close this page — the match
              will be here when you return.
            </p>
            {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
            <button
              className="rounded-lg border border-slate-500/40 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700/40"
              onClick={() => game.toMenu()}
            >
              Back to menu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
