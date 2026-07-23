// v18 — cloud profile bridge. When the user is signed in, the local Commander's
// Record is pushed to the server (max-merge, so no device ever loses progress)
// and the merged result is written back to localStorage.
import { useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { loadProfile, saveProfile, type PlayerProfile } from "@/game/core/profile";

/** Map the local profile shape onto the server stats payload. */
function toServerStats(p: PlayerProfile) {
  return {
    ...(p.name ? { commanderName: p.name.slice(0, 40) } : {}),
    games: p.games,
    wins: p.wins,
    bestScore: p.bestScore,
    duelsWon: p.duelsWon,
    campsRazed: p.campsRazed,
    battlesWon: p.kills,
    heroesLost: p.heroesLost,
    highestHeroLevel: 0, // reserved; local profile doesn't track this yet
  };
}

/** Merge the authoritative server profile back into local storage. */
function applyServerProfile(server: {
  commanderName: string;
  games: number;
  wins: number;
  bestScore: number;
  duelsWon: number;
  campsRazed: number;
  battlesWon: number;
  heroesLost: number;
}) {
  const p = loadProfile();
  if (server.commanderName && server.commanderName !== "Commander" && !p.name) p.name = server.commanderName;
  p.games = Math.max(p.games, server.games);
  p.wins = Math.max(p.wins, server.wins);
  p.bestScore = Math.max(p.bestScore, server.bestScore);
  p.duelsWon = Math.max(p.duelsWon, server.duelsWon);
  p.campsRazed = Math.max(p.campsRazed, server.campsRazed);
  p.kills = Math.max(p.kills, server.battlesWon);
  p.heroesLost = Math.max(p.heroesLost, server.heroesLost);
  saveProfile(p);
}

/**
 * Keeps local & cloud Commander's Record in sync while signed in.
 * Call once from the main menu. Also re-syncs when `syncKey` changes
 * (e.g. bump it after a game ends so fresh stats upload promptly).
 */
export function useCloudProfile(syncKey = 0) {
  const { isAuthenticated } = useAuth();
  const sync = trpc.profile.sync.useMutation();
  const synced = useRef<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (synced.current === syncKey) return;
    synced.current = syncKey;
    const local = loadProfile();
    sync.mutate(toServerStats(local), {
      onSuccess: server => {
        if (server) applyServerProfile(server);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, syncKey]);

  return { isAuthenticated, syncing: sync.isPending };
}
