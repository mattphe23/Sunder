// Sunder diplomacy UI — Isoglow glass panels; dove-and-dagger politics.
// Rivals panel: relation status, strength hint, Offer Peace / Demand Tribute / Gift buttons.
// IncomingOffer modal: an AI sues for peace at the start of your turn.
import { useState } from "react";
import { useGame } from "../useGame";
import { game } from "../core/state";
import { Button } from "@/components/ui/button";
import { Bird, X, Star, Swords, HandCoins, Gift, Shield } from "lucide-react";
import { sound } from "../sound";

const panel = "rounded-xl border border-white/10 bg-[#1b1b3f]/90 backdrop-blur-md shadow-xl shadow-black/40 text-slate-100";

function strengthLabel(ratio: number): { text: string; cls: string } {
  // ratio = them / you
  if (ratio > 1.35) return { text: "Stronger than you", cls: "text-rose-300" };
  if (ratio > 0.75) return { text: "Evenly matched", cls: "text-amber-300" };
  return { text: "Weaker than you", cls: "text-emerald-300" };
}

export function DiplomacyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const g = useGame();
  const s = g.state;
  const [toast, setToast] = useState<string | null>(null);
  if (!open || s.phase !== "playing") return null;
  const isMyTurn = s.currentTribe === s.humanTribe && !s.aiThinking;
  const rivals = s.tribes.filter((t) => t.alive && t.index !== s.humanTribe && !(s.humanTribes ?? []).includes(t.index));

  const say = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(null), 3500); };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`${panel} w-full max-w-md p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold tracking-wide text-slate-100">
            <Bird className="mr-2 inline h-5 w-5 text-sky-300" />Diplomacy
          </h2>
          <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-3">
          {rivals.map((t) => {
            const rel = game.relationWith(t.index);
            const str = strengthLabel(rel.strengthRatio);
            const can = isMyTurn && game.canDiplo(t.index);
            return (
              <div key={t.index} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-display text-sm font-bold">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </span>
                  {rel.atPeace ? (
                    <span className="flex items-center gap-1 rounded-full bg-sky-400/15 px-2 py-0.5 text-[11px] text-sky-300">
                      <Shield className="h-3 w-3" /> Peace · {rel.turnsLeft} turns
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-rose-400/15 px-2 py-0.5 text-[11px] text-rose-300">
                      <Swords className="h-3 w-3" /> At war
                    </span>
                  )}
                </div>
                <div className={`mb-2 text-xs ${str.cls}`}>{str.text}</div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" disabled={!can || rel.atPeace}
                    className="h-8 gap-1 border border-sky-400/30 bg-sky-400/10 px-2.5 text-xs text-sky-200 hover:bg-sky-400/20"
                    onClick={() => {
                      const res = game.offerPeace(t.index);
                      if (!res) return;
                      if (res.accepted) sound.play("treaty");
                      say(res.reason);
                    }}>
                    <Bird className="h-3.5 w-3.5" /> Offer peace
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!can || rel.atPeace}
                    className="h-8 gap-1 border border-amber-400/30 bg-amber-400/10 px-2.5 text-xs text-amber-200 hover:bg-amber-400/20"
                    onClick={() => {
                      const res = game.demandTribute(t.index);
                      if (!res) return;
                      if (res.paid) sound.play("plunder");
                      say(res.paid ? `${res.reason} (+${res.amount}★)` : res.reason);
                    }}>
                    <HandCoins className="h-3.5 w-3.5" /> Demand tribute
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!can || s.tribes[s.humanTribe].stars < 3}
                    className="h-8 gap-1 border border-emerald-400/30 bg-emerald-400/10 px-2.5 text-xs text-emerald-200 hover:bg-emerald-400/20"
                    onClick={() => {
                      if (game.giftStars(t.index, 3)) { sound.play("plunder"); say(`You gifted 3★ to ${t.name}. Relations warm.`); }
                    }}>
                    <Gift className="h-3.5 w-3.5" /> Gift 3<Star className="h-3 w-3 fill-emerald-200" />
                  </Button>
                </div>
              </div>
            );
          })}
          {rivals.length === 0 && <p className="text-sm text-slate-400">No rivals remain to negotiate with.</p>}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
          One diplomatic action per rival per turn. Rivals judge you by relative strength — and they remember betrayals.
        </p>
        {toast && (
          <div className="mt-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-slate-100">{toast}</div>
        )}
      </div>
    </div>
  );
}

/** Modal shown when an AI proactively offers the human a peace treaty. */
export function IncomingOfferModal() {
  const g = useGame();
  const s = g.state;
  const offer = s.incomingOffer;
  if (!offer || s.phase !== "playing") return null;
  // only surface it when it's the recipient human's turn (not mid-AI processing)
  if (s.aiThinking || s.currentTribe !== offer.to || s.currentTribe !== s.humanTribe) return null;
  const from = s.tribes[offer.from];
  if (!from?.alive) { game.respondToOffer(false); return null; }
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
      <div className={`${panel} w-full max-w-sm p-5 text-center`}>
        <Bird className="mx-auto mb-2 h-8 w-8 text-sky-300" />
        <h3 className="font-display text-base font-bold text-slate-100">An envoy arrives</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          <span className="font-bold" style={{ color: from.color }}>{from.name}</span> sues for peace,
          offering a 6-turn non-aggression treaty.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button className="min-h-[40px] bg-sky-400 font-display font-bold text-[#1b1b3f] hover:bg-sky-300"
            onClick={() => { sound.play("treaty"); game.respondToOffer(true); }}>
            Accept treaty
          </Button>
          <Button variant="secondary" className="min-h-[40px] border border-white/15 bg-white/10 text-slate-200 hover:bg-white/20"
            onClick={() => { sound.play("click"); game.respondToOffer(false); }}>
            Refuse
          </Button>
        </div>
      </div>
    </div>
  );
}
