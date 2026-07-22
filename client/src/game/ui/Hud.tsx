// Polyforge HUD — Isoglow glass panels over the indigo void; amber star accent.
import { useGame } from "../useGame";
import { game } from "../core/state";
import { UNIT_STATS, TECHS, PORT_COST, WALL_COST } from "../core/types";
import {
  techCost, canResearch, trainableUnits, starIncome, cityAt, canHarvest,
  harvestCost, canBuildPort,
} from "../core/rules";
import { Button } from "@/components/ui/button";
import { Star, Swords, FlaskConical, X, ChevronRight, Anchor, Ship, Skull, Shield, Flag, Landmark, ScrollText, Undo2 } from "lucide-react";
import { useState } from "react";
import { MuteButton } from "./MuteButton";
import { sound } from "../sound";

const panel = "rounded-xl border border-white/10 bg-[#1b1b3f]/85 backdrop-blur-md shadow-xl shadow-black/40 text-slate-100";

/** Turn replay — recap of what rivals did while the player waited. */
export function TurnRecap() {
  const g = useGame();
  const s = g.state;
  if (!s.showRecap || s.recap.length === 0 || s.phase !== "playing") return null;
  const icon = (kind: string) => {
    switch (kind) {
      case "combat": return <Swords className="h-3.5 w-3.5 text-red-400" />;
      case "capture": return <Flag className="h-3.5 w-3.5 text-amber-300" />;
      case "cityLost": return <Flag className="h-3.5 w-3.5 text-red-400" />;
      case "ruin": return <Landmark className="h-3.5 w-3.5 text-cyan-300" />;
      case "fallen": return <Skull className="h-3.5 w-3.5 text-slate-400" />;
      default: return <ScrollText className="h-3.5 w-3.5 text-slate-400" />;
    }
  };
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => game.dismissRecap()}>
      <div className={`${panel} w-full max-w-sm p-4`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-sm font-bold text-amber-300">
            <ScrollText className="h-4 w-4" /> While you were away…
          </span>
          <button onClick={() => game.dismissRecap()} aria-label="Dismiss recap">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        <div className="max-h-64 space-y-1.5 overflow-y-auto">
          {s.recap.map((e, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-md border-l-4 bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 ${e.kind === "cityLost" ? "border-red-400/70" : ""}`}
              style={{ borderLeftColor: e.kind === "cityLost" ? undefined : `${s.tribes[e.tribe]?.color}aa` }}
            >
              <span className="mt-0.5 shrink-0">{icon(e.kind)}</span>
              <span>{e.text}</span>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3 w-full bg-amber-400 font-display font-bold text-[#1b1b3f] hover:bg-amber-300" onClick={() => game.dismissRecap()}>
          To battle
        </Button>
      </div>
    </div>
  );
}

/** Battle preview — shows predicted damage/retaliation before the attack commits. */
export function BattlePreview() {
  const g = useGame();
  const s = g.state;
  const p = game.pendingAttack;
  if (!p || s.phase !== "playing") return null;
  const attacker = s.units.find((u) => u.id === p.attackerId);
  const defender = s.units.find((u) => u.id === p.defenderId);
  if (!attacker || !defender) return null;
  const aStats = UNIT_STATS[attacker.type];
  const dStats = UNIT_STATS[defender.type];
  return (
    <div className={`${panel} absolute bottom-16 left-1/2 z-30 w-72 -translate-x-1/2 border-red-400/30 p-3`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold text-red-300">
          <Swords className="h-4 w-4" /> Battle Preview
        </span>
        <button onClick={() => game.cancelAttack()} aria-label="Cancel attack">
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>
      <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
        <div className="rounded-md bg-white/5 p-2">
          <p className="text-xs font-bold text-slate-100">{aStats.name}</p>
          <p className="font-mono text-[11px] text-slate-300">{attacker.hp}/{attacker.maxHp} HP</p>
          {p.retaliation > 0 ? (
            <p className={`mt-1 font-mono text-sm font-bold ${p.attackerDies ? "text-red-400" : "text-amber-300"}`}>
              −{p.retaliation}
            </p>
          ) : (
            <p className="mt-1 flex items-center justify-center gap-1 text-[11px] text-emerald-300">
              <Shield className="h-3 w-3" /> no retaliation
            </p>
          )}
          {p.attackerDies && <p className="flex items-center justify-center gap-1 text-[10px] text-red-400"><Skull className="h-3 w-3" /> falls</p>}
        </div>
        <Swords className="h-5 w-5 text-red-400" />
        <div className="rounded-md bg-white/5 p-2">
          <p className="text-xs font-bold text-slate-100">{dStats.name}</p>
          <p className="font-mono text-[11px] text-slate-300">{defender.hp}/{defender.maxHp} HP</p>
          <p className={`mt-1 font-mono text-sm font-bold ${p.defenderDies ? "text-red-400" : "text-red-300"}`}>
            −{p.dmg}
          </p>
          {p.defenderDies && <p className="flex items-center justify-center gap-1 text-[10px] text-red-400"><Skull className="h-3 w-3" /> falls</p>}
        </div>
      </div>
      {p.modifiers.length > 0 && (
        <div className="mb-2 flex flex-wrap justify-center gap-1">
          {p.modifiers.map((m) => (
            <span
              key={m.text}
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold leading-tight ${m.side === "atk" ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-sky-400/40 bg-sky-400/10 text-sky-200"}`}
            >
              {m.text}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="min-h-[44px] flex-1 border border-white/10 bg-white/10 text-slate-200 hover:bg-white/20 sm:min-h-0" onClick={() => game.cancelAttack()}>
          Cancel
        </Button>
        <Button size="sm" className="min-h-[44px] flex-1 gap-1 bg-red-500 font-bold text-white hover:bg-red-400 sm:min-h-0" onClick={() => game.confirmAttack()}>
          <Swords className="h-3.5 w-3.5" /> Attack
        </Button>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-slate-400">Tip: click the target again to confirm</p>
    </div>
  );
}

export function TopBar() {
  const g = useGame();
  const s = g.state;
  const me = s.tribes[s.humanTribe];
  if (!me) return null;
  const isMyTurn = s.currentTribe === s.humanTribe && !s.aiThinking;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3">
      <div className={`${panel} pointer-events-auto flex items-center gap-3 px-4 py-2`}>
        <span className="h-3 w-3 rounded-full" style={{ background: me.color }} />
        <span className="font-display text-sm font-bold tracking-wide">{me.name}</span>
        <span className="flex items-center gap-1 text-amber-300">
          <Star className="h-4 w-4 fill-amber-300" />
          <span className="font-mono text-sm">{me.stars}</span>
          <span className="text-xs text-amber-200/70">+{starIncome(s, s.humanTribe)}</span>
        </span>
        <span className="text-xs text-slate-300/80">Turn {s.turn + 1}/{s.maxTurns}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`${panel} pointer-events-auto px-4 py-2 text-xs`}>
          {s.aiThinking || !isMyTurn ? (
            <span className="animate-pulse text-slate-300">
              {s.tribes[s.currentTribe]?.name} is thinking…
            </span>
          ) : (
            <span className="text-emerald-300">Your turn</span>
          )}
        </div>
        <MuteButton />
      </div>
    </div>
  );
}

export function BottomBar({ onOpenTech }: { onOpenTech: () => void }) {
  const g = useGame();
  const s = g.state;
  const isMyTurn = s.currentTribe === s.humanTribe && !s.aiThinking;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-3" style={{ touchAction: "manipulation" }}>
      <div className="pointer-events-auto flex gap-2">
        <Button variant="secondary" size="sm" className="min-h-[44px] gap-1.5 border border-white/10 bg-[#1b1b3f]/85 px-4 text-slate-100 backdrop-blur-md hover:bg-[#2a2a55] sm:min-h-0 sm:px-3" onClick={onOpenTech}>
          <FlaskConical className="h-4 w-4 text-cyan-300" /> Research
        </Button>
        {game.canUndo() && (
          <Button
            variant="secondary"
            size="sm"
            className="min-h-[44px] gap-1.5 border border-sky-400/40 bg-[#1b1b3f]/85 px-4 text-sky-200 backdrop-blur-md hover:bg-[#2a2a55] sm:min-h-0 sm:px-3"
            onClick={() => game.undoMove()}
            title="Undo the last move (before attacking or ending the turn)"
          >
            <Undo2 className="h-4 w-4" /> Undo
          </Button>
        )}
      </div>
      <div className="pointer-events-auto">
        <Button
          size="lg"
          disabled={!isMyTurn}
          onClick={() => { sound.play("click"); g.endTurn(); }}
          className="min-h-[48px] gap-2 bg-amber-400 font-display font-bold text-[#1b1b3f] shadow-lg shadow-amber-500/25 transition-transform hover:bg-amber-300 active:scale-[0.97]"
        >
          End Turn <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function SelectionPanel() {
  const g = useGame();
  const s = g.state;
  const unit = s.units.find((u) => u.id === s.selectedUnitId);
  const city = s.selectedCityId !== null ? s.cities[s.selectedCityId] : null;
  if (!unit && !city) return null;

  if (unit) {
    const st = UNIT_STATS[unit.type];
    const here = cityAt(s, unit.x, unit.y);
    const canCapture = here && here.tribe !== unit.tribe && !unit.moved;
    return (
      <div className={`${panel} absolute bottom-16 left-3 z-20 w-60 p-3`}>
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-display text-sm font-bold">
            {unit.boat && <Ship className="h-4 w-4 text-cyan-300" />}
            {unit.veteran && <span className="text-amber-400" title="Veteran">◆</span>}
            {unit.veteran ? "Veteran " : ""}{st.name}{unit.boat && " (at sea)"}
          </span>
          <button onClick={() => g.selectUnit(null)}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        {st.perk && (
          <p className="mb-1 text-[11px] text-violet-300/90">
            <span className="mr-1 rounded bg-violet-400/20 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-violet-300">Unique</span>
            {st.perk}
          </p>
        )}
        {!unit.veteran && !unit.guardian && (
          <p className="mb-1 flex items-center gap-1 text-[11px] text-slate-400">
            Kills:
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-1.5 w-1.5 rotate-45 ${i < unit.kills ? "bg-amber-400" : "bg-white/15"}`} />
            ))}
            <span className="ml-1 text-slate-500">3 kills → Veteran (+5 max HP)</span>
          </p>
        )}
        {unit.veteran && <p className="mb-1 text-[11px] text-amber-300/90">Battle-hardened — promoted for 3 kills (+5 max HP)</p>}
        {unit.boat && <p className="mb-1 text-[11px] text-cyan-200/80">Embarked — cannot attack; weaker in defense. Land to fight.</p>}
        <div className="mb-2 h-1.5 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-emerald-400" style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }} />
        </div>
        <div className="grid grid-cols-4 gap-1 text-center text-[11px] text-slate-300">
          <div><div className="font-mono text-slate-100">{unit.hp}/{unit.maxHp}</div>HP</div>
          <div><div className="font-mono text-slate-100">{st.attack}</div>ATK</div>
          <div><div className="font-mono text-slate-100">{st.defense}</div>DEF</div>
          <div><div className="font-mono text-slate-100">{st.range}</div>RNG</div>
        </div>
        {canCapture && (
          <Button size="sm" className="mt-2 w-full bg-amber-400 font-bold text-[#1b1b3f] hover:bg-amber-300" onClick={() => g.captureCity(unit.id)}>
            <Swords className="h-4 w-4" /> Capture {here!.name}
          </Button>
        )}
        {unit.moved && unit.attacked && <p className="mt-2 text-center text-[11px] text-slate-400">Done for this turn</p>}
      </div>
    );
  }

  if (city && city.tribe === s.humanTribe) {
    const me = s.tribes[s.humanTribe];
    const harvestables = s.tiles.filter((t) => t.ownerCityId === city.id && t.resource && canHarvest(s, s.humanTribe, t));
    const portSites = s.tiles.filter((t) => t.ownerCityId === city.id && canBuildPort(s, s.humanTribe, t));
    return (
      <div className={`${panel} absolute bottom-16 left-3 z-20 w-64 p-3`}>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display text-sm font-bold">
            {city.name} {city.isCapital && <span className="text-amber-300">★</span>}
          </span>
          <button onClick={() => g.selectCity(null)}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <p className="mb-2 text-[11px] text-slate-300">Level {city.level} · Pop {city.population}/3</p>
        {city.walls && (
          <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-slate-200">
            <Shield className="h-3 w-3 text-slate-300" /> Walled — defenders gain a fortified bonus
          </p>
        )}
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Train unit</p>
        <div className="mb-2 grid grid-cols-2 gap-1">
          {trainableUnits(s, s.humanTribe).map((ut) => {
            const st = UNIT_STATS[ut];
            const afford = me.stars >= st.cost;
            const unique = st.faction !== undefined;
            return (
              <button
                key={ut}
                disabled={!afford}
                onClick={() => { sound.play("click"); g.train(city.id, ut); }}
                title={st.perk}
                className={`flex min-h-[40px] items-center justify-between rounded-md border px-2 py-1 text-xs transition-colors sm:min-h-0 ${unique ? "border-violet-400/40" : "border-white/10"} ${afford ? (unique ? "bg-violet-400/10 hover:bg-violet-400/20" : "bg-white/5 hover:bg-white/15") : "opacity-40"}`}
              >
                <span className="flex items-center gap-1">
                  {unique && <span className="text-violet-300" title="Faction-unique unit">✦</span>}
                  {st.name}
                </span>
                <span className="flex items-center gap-0.5 text-amber-300"><Star className="h-3 w-3 fill-amber-300" />{st.cost}</span>
              </button>
            );
          })}
        </div>
        {harvestables.length > 0 && (
          <>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Harvest ({harvestCost(s, s.humanTribe)}★ each)
            </p>
            <div className="flex flex-wrap gap-1">
              {harvestables.map((t) => (
                <button
                  key={`${t.x},${t.y}`}
                  onClick={() => g.harvest(t.x, t.y)}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs capitalize hover:bg-white/15"
                >
                  {t.resource}
                </button>
              ))}
            </div>
          </>
        )}
        {portSites.length > 0 && (
          <>
            <p className="mb-1 mt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Build port ({PORT_COST}★)
            </p>
            <div className="flex flex-wrap gap-1">
              {portSites.map((t) => (
                <button
                  key={`p${t.x},${t.y}`}
                  disabled={me.stars < PORT_COST}
                  onClick={() => g.buildPort(t.x, t.y)}
                  className={`flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs ${me.stars >= PORT_COST ? "bg-white/5 hover:bg-white/15" : "opacity-40"}`}
                >
                  <Anchor className="h-3 w-3 text-cyan-300" /> ({t.x},{t.y})
                </button>
              ))}
            </div>
          </>
        )}
        {!city.walls && city.level >= 3 && (
          <button
            disabled={me.stars < WALL_COST}
            onClick={() => g.buildWalls(city.id)}
            className={`mt-2 flex w-full items-center justify-between rounded-md border border-white/10 px-2 py-1.5 text-xs transition-colors ${me.stars >= WALL_COST ? "bg-white/5 hover:bg-white/15" : "opacity-40"}`}
          >
            <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-slate-300" /> Build city walls</span>
            <span className="flex items-center gap-0.5 text-amber-300"><Star className="h-3 w-3 fill-amber-300" />{WALL_COST}</span>
          </button>
        )}
        {!city.walls && city.level < 3 && (
          <p className="mt-2 text-[10px] text-slate-500">Reach level 3 to build city walls.</p>
        )}
      </div>
    );
  }
  return null;
}

export function TechPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const g = useGame();
  const s = g.state;
  const me = s.tribes[s.humanTribe];
  if (!open || !me) return null;
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className={`${panel} max-h-[80vh] w-full max-w-md overflow-y-auto p-4`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Research</h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-amber-300"><Star className="h-4 w-4 fill-amber-300" />{me.stars}</span>
            <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
          </div>
        </div>
        <p className="mb-3 text-[11px] text-slate-400">Tech costs scale with your empire size — plan your path.</p>
        <div className="space-y-1.5">
          {TECHS.map((t) => {
            const owned = me.techs.includes(t.id);
            const locked = t.requires !== null && !me.techs.includes(t.requires);
            const cost = techCost(s, s.humanTribe, t.id);
            const affordable = canResearch(s, s.humanTribe, t.id);
            return (
              <div key={t.id} className={`flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 ${owned ? "bg-emerald-400/10" : locked ? "opacity-40" : "bg-white/5"}`}>
                <div>
                  <p className="text-sm font-semibold">{t.name} <span className="text-[10px] text-slate-400">T{t.tier}</span></p>
                  <p className="text-[11px] text-slate-400">{t.desc}</p>
                  {locked && <p className="text-[10px] text-slate-500">Requires {TECHS.find((q) => q.id === t.requires)?.name}</p>}
                </div>
                {owned ? (
                  <span className="text-xs font-semibold text-emerald-300">Known</span>
                ) : (
                  <Button size="sm" variant="secondary" disabled={!affordable} onClick={() => g.research(t.id)} className="gap-1 border border-white/10 bg-white/10 text-slate-100 hover:bg-white/20">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" />{cost}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function LogTicker() {
  const g = useGame();
  const s = g.state;
  if (s.log.length === 0) return null;
  return (
    <div className="pointer-events-none absolute left-1/2 top-14 z-10 -translate-x-1/2 text-center">
      <p className="rounded-full bg-black/40 px-4 py-1 text-xs text-slate-200 backdrop-blur-sm">{s.log[0]}</p>
    </div>
  );
}
