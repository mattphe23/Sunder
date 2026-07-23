// v18 — the menu's Online Duels panel: sign in, create an invite match,
// accept a ?m= invite, and resume matches from the My Matches list.
import { useState } from "react";
import { Globe2, ChevronDown, Copy, Check, Swords, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { game } from "@/game/core/state";
import { sound } from "@/game/sound";
import { loadProfile } from "@/game/core/profile";
import { TRIBE_DEFS } from "@/game/core/types";
import { useCloudProfile } from "./useCloudProfile";

/** read a pending ?m= invite from the URL (mirrors the ?c= friend-challenge flow) */
export function readMatchInviteFromUrl(): string | null {
  try {
    const m = new URLSearchParams(window.location.search).get("m");
    return m && /^[\w-]{6,24}$/.test(m) ? m : null;
  } catch {
    return null;
  }
}

function myName() {
  const n = loadProfile().name?.trim();
  return n && n.length > 0 ? n : "Commander";
}

/** Start (or resume) an online match locally from server match data + snapshot. */
function enterMatch(m: {
  id: string; seed: number; preset: string; size: number;
  hostTribe: number; guestTribe: number; hostName: string; guestName: string | null;
  hostUserId: number;
}, state: string | null, myUserId: number) {
  const online = {
    matchId: m.id,
    hostTribe: m.hostTribe,
    guestTribe: m.guestTribe,
    hostName: m.hostName,
    guestName: m.guestName ?? "",
  };
  const myTribe = m.hostUserId === myUserId ? m.hostTribe : m.guestTribe;
  // a turn-0 snapshot is always written at create(), so state should never be null
  if (!state) return false;
  const ok = game.loadOnlineSnapshot(state, myTribe);
  if (ok) {
    // ensure online metadata is current (guest name arrives after join)
    game.state.online = online;
  }
  return ok;
}

export function OnlinePanel({ faction }: { faction: number }) {
  const { user, isAuthenticated, loading } = useAuth();
  useCloudProfile();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [invite] = useState(() => readMatchInviteFromUrl());
  const utils = trpc.useUtils();

  const createMatch = trpc.match.create.useMutation();
  const joinMatch = trpc.match.join.useMutation();
  const { data: myMatches, isLoading: matchesLoading } = trpc.match.myMatches.useQuery(undefined, {
    enabled: isAuthenticated && open,
    refetchInterval: open ? 30000 : false,
  });
  const { data: inviteMatch } = trpc.match.get.useQuery(
    { matchId: invite ?? "" },
    { enabled: !!invite && isAuthenticated, retry: false },
  );

  const hostTribeDef = Math.min(faction, TRIBE_DEFS.length - 1);

  const onCreate = () => {
    sound.play("click");
    // Host picks their faction; guest gets a random different tribe def.
    const others = TRIBE_DEFS.map((_, i) => i).filter(i => i !== hostTribeDef);
    const guestTribeDef = others[Math.floor(Math.random() * others.length)];
    const seed = Math.floor(Math.random() * 2 ** 31);
    const size = 11;
    const preset = "continents";
    // Build turn 0 locally so we can snapshot it as the initial state.
    const online = { matchId: "pending", hostTribe: 0, guestTribe: 1, hostName: myName(), guestName: "" };
    game.newGame({
      size, humanTribe: 0, difficulty: "normal", seed, preset,
      humanTribes: [0, 1], roster: [hostTribeDef, guestTribeDef], online,
    });
    const initialState = game.serializeState();
    game.toMenu(); // wait in menu until the match exists; host enters via My Matches or auto below
    createMatch.mutate(
      { seed, preset, size, hostTribe: 0, guestTribe: 1, hostName: myName(), initialState },
      {
        onSuccess: ({ id }) => {
          setCreatedId(id);
          // enter the match now — host plays turn 1 while the invite is out
          utils.match.get.fetch({ matchId: id }).then(res => {
            if (res && user) enterMatch(res.match, res.state, user.id);
          });
        },
      },
    );
  };

  const inviteUrl = createdId ? `${window.location.origin}/?m=${createdId}` : null;
  const copyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard?.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const onAcceptInvite = () => {
    if (!invite || !user) return;
    sound.play("click");
    joinMatch.mutate(
      { matchId: invite, guestName: myName() },
      {
        onSuccess: () => {
          try { window.history.replaceState({}, "", window.location.pathname); } catch { /* noop */ }
          utils.match.get.fetch({ matchId: invite }).then(res => {
            if (res && user) enterMatch(res.match, res.state, user.id);
          });
        },
      },
    );
  };

  const resume = (id: string) => {
    sound.play("click");
    utils.match.get.fetch({ matchId: id }).then(res => {
      if (res && user) enterMatch(res.match, res.state, user.id);
    });
  };

  return (
    <div className="mt-2 w-full">
      {/* invite banner — arrived via a shared ?m= link */}
      {invite && isAuthenticated && inviteMatch === undefined && !joinMatch.isSuccess && (
        <div className="mb-1.5 rounded-lg border-2 border-cyan-400/60 bg-cyan-400/10 p-3">
          <span className="flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-wider text-cyan-300">
            <Swords className="h-4 w-4" /> Checking invite…
          </span>
        </div>
      )}
      {invite && inviteMatch && !joinMatch.isSuccess && (
        <button
          onClick={onAcceptInvite}
          disabled={joinMatch.isPending}
          className="relative mb-1.5 block w-full overflow-hidden rounded-lg border-2 border-cyan-400/60 bg-cyan-400/10 p-3 text-left shadow-[0_0_24px_rgba(34,211,238,0.2)] transition-colors hover:bg-cyan-400/20 active:scale-[0.98]"
        >
          <span className="flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-wider text-cyan-300">
            <Swords className="h-4 w-4" /> {inviteMatch.match.hostName} summons you to an online duel!
          </span>
          <span className="mt-1 block text-[11px] leading-tight text-slate-200">
            Async 1v1 on {inviteMatch.match.preset} {inviteMatch.match.size}×{inviteMatch.match.size} — play your turns whenever you like.
          </span>
          <span className="mt-1.5 inline-block rounded bg-cyan-400 px-2 py-0.5 font-display text-[10px] font-black tracking-widest text-[#1b1b3f]">
            {joinMatch.isPending ? "JOINING…" : "ACCEPT THE DUEL"}
          </span>
        </button>
      )}
      {invite && !isAuthenticated && !loading && (
        <div className="mb-1.5 rounded-lg border-2 border-cyan-400/60 bg-cyan-400/10 p-3">
          <span className="font-display text-xs font-black uppercase tracking-wider text-cyan-300">
            You&apos;ve been challenged to an online duel!
          </span>
          <button
            onClick={() => startLogin()}
            className="mt-1.5 block rounded bg-cyan-400 px-2 py-0.5 font-display text-[10px] font-black tracking-widest text-[#1b1b3f]"
          >
            SIGN IN TO ACCEPT
          </button>
        </div>
      )}

      <button
        onClick={() => { sound.play("click"); setOpen(!open); }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-display text-xs font-bold uppercase tracking-[0.2em] text-slate-300 transition-colors hover:bg-white/10 active:scale-[0.98]"
      >
        <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
        Online Duels
        {(myMatches?.filter(m => m.yourTurn && m.status === "active").length ?? 0) > 0 && (
          <span className="rounded bg-cyan-400/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
            {myMatches!.filter(m => m.yourTurn && m.status === "active").length} your turn
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-white/10 bg-[#10102c]/85 p-3 backdrop-blur-md">
          {!isAuthenticated ? (
            <div className="text-center">
              <p className="mb-2 text-[11px] leading-snug text-slate-300">
                Sign in to duel other commanders across the Shatterlands — async 1v1
                matches you can play at your own pace, plus a cloud-synced Commander&apos;s Record.
              </p>
              <button
                onClick={() => startLogin()}
                className="rounded-lg border-2 border-cyan-400/60 bg-cyan-400/10 px-4 py-2 font-display text-xs font-black tracking-widest text-cyan-200 transition-colors hover:bg-cyan-400/20 active:scale-[0.98]"
              >
                SIGN IN
              </button>
            </div>
          ) : (
            <>
              {/* create */}
              {!createdId ? (
                <button
                  onClick={onCreate}
                  disabled={createMatch.isPending}
                  className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-cyan-400/60 bg-cyan-400/10 py-2.5 font-display text-xs font-black tracking-widest text-cyan-200 transition-colors hover:bg-cyan-400/20 active:scale-[0.98] disabled:opacity-50"
                >
                  {createMatch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                  CREATE DUEL — {TRIBE_DEFS[hostTribeDef].name.toUpperCase()}
                </button>
              ) : (
                <div className="mb-2 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-2.5">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-cyan-300">Invite link — send it to your rival</p>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 truncate rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-slate-300">{inviteUrl}</code>
                    <button onClick={copyInvite} className="rounded border border-white/10 p-1.5 text-slate-300 hover:bg-white/10">
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* my matches */}
              {matchesLoading ? (
                <p className="py-2 text-center text-[11px] text-slate-400">Consulting the forge records…</p>
              ) : (myMatches?.length ?? 0) === 0 ? (
                <p className="py-2 text-center text-[11px] text-slate-400">
                  No online duels yet — create one and send the link to a rival.
                </p>
              ) : (
                <div className="space-y-1">
                  {myMatches!.map(m => (
                    <button
                      key={m.id}
                      onClick={() => (m.status === "active" || m.status === "open") && resume(m.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-[11px] transition-colors ${
                        m.status === "active" || m.status === "open" ? "bg-white/5 hover:bg-white/10" : "bg-white/[0.02] opacity-70"
                      }`}
                      style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-display font-bold text-slate-200">vs {m.opponentName ?? "awaiting rival"}</span>
                        {m.status === "open" && <span className="rounded bg-slate-500/20 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">OPEN</span>}
                        {m.status === "active" && m.yourTurn && (
                          <span className="animate-pulse rounded bg-cyan-400/25 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">YOUR TURN</span>
                        )}
                        {m.status === "active" && !m.yourTurn && (
                          <span className="rounded bg-slate-500/20 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">THEIR TURN</span>
                        )}
                        {(m.status === "finished" || m.status === "abandoned") && (
                          <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${m.youWon ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>
                            {m.youWon ? "VICTORY" : "DEFEAT"}
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">T{m.turnNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
