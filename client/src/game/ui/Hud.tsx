// Polyforge HUD — Isoglow glass panels over the indigo void; amber star accent.
import { useGame } from "../useGame";
import { UNIT_STATS, TECHS, UnitType, TechId } from "../core/types";
import {
  techCost, canResearch, trainableUnits, starIncome, cityAt, canHarvest,
  harvestCost, tileAt,
} from "../core/rules";
import { Button } from "@/components/ui/button";
import { Star, Swords, FlaskConical, X, ChevronRight } from "lucide-react";
import { useState } from "react";

const panel = "rounded-xl border border-white/10 bg-[#1b1b3f]/85 backdrop-blur-md shadow-xl shadow-black/40 text-slate-100";

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
      <div className={`${panel} pointer-events-auto px-4 py-2 text-xs`}>
        {s.aiThinking || !isMyTurn ? (
          <span className="animate-pulse text-slate-300">
            {s.tribes[s.currentTribe]?.name} is thinking…
          </span>
        ) : (
          <span className="text-emerald-300">Your turn</span>
        )}
      </div>
    </div>
  );
}

export function BottomBar({ onOpenTech }: { onOpenTech: () => void }) {
  const g = useGame();
  const s = g.state;
  const isMyTurn = s.currentTribe === s.humanTribe && !s.aiThinking;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-2 p-3">
      <div className="pointer-events-auto flex gap-2">
        <Button variant="secondary" size="sm" className="gap-1.5 border border-white/10 bg-[#1b1b3f]/85 text-slate-100 backdrop-blur-md hover:bg-[#2a2a55]" onClick={onOpenTech}>
          <FlaskConical className="h-4 w-4 text-cyan-300" /> Research
        </Button>
      </div>
      <div className="pointer-events-auto">
        <Button
          size="lg"
          disabled={!isMyTurn}
          onClick={() => g.endTurn()}
          className="gap-2 bg-amber-400 font-display font-bold text-[#1b1b3f] shadow-lg shadow-amber-500/25 transition-transform hover:bg-amber-300 active:scale-[0.97]"
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
          <span className="font-display text-sm font-bold">{st.name}</span>
          <button onClick={() => g.selectUnit(null)}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
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
    return (
      <div className={`${panel} absolute bottom-16 left-3 z-20 w-64 p-3`}>
        <div className="mb-1 flex items-center justify-between">
          <span className="font-display text-sm font-bold">
            {city.name} {city.isCapital && <span className="text-amber-300">★</span>}
          </span>
          <button onClick={() => g.selectCity(null)}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <p className="mb-2 text-[11px] text-slate-300">Level {city.level} · Pop {city.population}/3</p>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Train unit</p>
        <div className="mb-2 grid grid-cols-2 gap-1">
          {trainableUnits(s, s.humanTribe).map((ut) => {
            const st = UNIT_STATS[ut];
            const afford = me.stars >= st.cost;
            return (
              <button
                key={ut}
                disabled={!afford}
                onClick={() => g.train(city.id, ut)}
                className={`flex items-center justify-between rounded-md border border-white/10 px-2 py-1 text-xs transition-colors ${afford ? "bg-white/5 hover:bg-white/15" : "opacity-40"}`}
              >
                <span>{st.name}</span>
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

