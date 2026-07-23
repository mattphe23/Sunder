// Sunder — v19 turn notifications. Watches "my matches" while signed in and
// announces when a duel becomes your turn: an in-app toast, a tab-title flash,
// and a soft chime. Poll-based (async duels don't need realtime sockets); the
// per-user Manus push channel isn't available, so alerts are in-app.
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { sound } from "../sound";

const POLL_MS = 30_000;
const BASE_TITLE = "Sunder: The Living Forge";

export function TurnAlerts() {
  const { isAuthenticated } = useAuth();
  const { data: matches } = trpc.match.myMatches.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
  });
  // matches already announced as "your turn" (avoid re-toasting every poll)
  const announced = useRef<Set<string>>(new Set());
  const flashTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const primed = useRef(false); // skip announcing on the very first fetch

  useEffect(() => {
    if (!matches) return;
    const mine = matches.filter(m => m.status === "active" && m.yourTurn);
    // stop flashing when no pending turns
    if (mine.length === 0) {
      if (flashTimer.current) { clearInterval(flashTimer.current); flashTimer.current = null; document.title = BASE_TITLE; }
      // allow re-announcing if a match cycles back to our turn later
      for (const id of Array.from(announced.current)) {
        if (!matches.some(m => m.id === id && m.yourTurn)) announced.current.delete(id);
      }
      primed.current = true;
      return;
    }
    if (!primed.current) {
      // First load: badge silently (OnlinePanel shows YOUR TURN), but do flash the title.
      for (const m of mine) announced.current.add(m.id);
      primed.current = true;
    } else {
      for (const m of mine) {
        if (announced.current.has(m.id)) continue;
        announced.current.add(m.id);
        sound.play("levelup");
        toast(`Your move, Commander`, {
          description: `${m.opponentName ?? "Your opponent"} has played — turn ${m.turnNumber + 1} awaits in your duel.`,
          duration: 10_000,
        });
      }
    }
    // flash the tab title while any duel waits on us
    if (!flashTimer.current) {
      let on = false;
      flashTimer.current = setInterval(() => {
        on = !on;
        document.title = on ? "⚔ Your move — Sunder" : BASE_TITLE;
      }, 1500);
    }
    return () => { /* interval cleared when list empties or on unmount below */ };
  }, [matches]);

  useEffect(() => () => {
    if (flashTimer.current) { clearInterval(flashTimer.current); document.title = BASE_TITLE; }
  }, []);

  return null;
}
