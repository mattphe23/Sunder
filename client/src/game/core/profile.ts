// Sunder — player profile: a persistent local identity with lifetime stats.
// Shares the name with friend challenges; updated at game over and on notable feats.
const PROFILE_KEY = "polyforge-profile-v1";
const LEGACY_NAME_KEY = "polyforge-player-name";

export interface PlayerProfile {
  name: string;
  games: number;
  wins: number;
  kills: number;
  heroesLost: number;
  campsRazed: number;
  guardiansSlain: number;
  bestScore: number;
  fastestWin: number | null; // turns
  duelsWon: number; // friend challenges beaten
  createdAt: string;
}

export function emptyProfile(): PlayerProfile {
  return {
    name: "", games: 0, wins: 0, kills: 0, heroesLost: 0, campsRazed: 0,
    guardiansSlain: 0, bestScore: 0, fastestWin: null, duelsWon: 0,
    createdAt: new Date().toISOString().slice(0, 10),
  };
}

export function loadProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...emptyProfile(), ...JSON.parse(raw) };
    // migrate the v16 share-name if present
    const legacy = localStorage.getItem(LEGACY_NAME_KEY);
    const p = emptyProfile();
    if (legacy) p.name = legacy;
    return p;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: PlayerProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    if (p.name) localStorage.setItem(LEGACY_NAME_KEY, p.name); // keep v16 share flow in sync
  } catch { /* private mode */ }
}

export function setProfileName(name: string): PlayerProfile {
  const p = loadProfile();
  p.name = name.trim().slice(0, 20);
  saveProfile(p);
  return p;
}

/** merge a finished game's outcome into the lifetime record */
export function recordGameResult(r: {
  won: boolean; score: number; turns: number; kills: number;
  heroLost: boolean; campsRazed: number; guardiansSlain: number; duelWon?: boolean;
}): PlayerProfile {
  const p = loadProfile();
  p.games += 1;
  if (r.won) {
    p.wins += 1;
    if (p.fastestWin === null || r.turns < p.fastestWin) p.fastestWin = r.turns;
  }
  p.kills += r.kills;
  if (r.heroLost) p.heroesLost += 1;
  p.campsRazed += r.campsRazed;
  p.guardiansSlain += r.guardiansSlain;
  if (r.score > p.bestScore) p.bestScore = r.score;
  if (r.duelWon) p.duelsWon += 1;
  saveProfile(p);
  return p;
}
