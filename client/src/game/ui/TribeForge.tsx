// Sunder — Isoglow. Tribe Forge: assemble a custom tribe from balanced
// building blocks (passive, unique unit, start tech, banner color, name).
// Deep indigo modal, amber spark accents, faction-color reactive frame.
import { useState } from "react";
import {
  CustomTribeConfig, FORGE_PASSIVES, FORGE_UNITS, FORGE_TECHS, FORGE_COLORS,
  loadCustomTribe, saveCustomTribe, deleteCustomTribe, FORGE_PRESETS,
} from "../core/customTribe";
import { UNIT_STATS, UnitType, FactionPassive, TechId } from "../core/types";
import { Hammer, X, Star, Trash2, Sparkles, Lock } from "lucide-react";
import { CHAPTER_REWARDS, rewardEarned, chapterStars } from "../core/story";
import { sound } from "../sound";

export function TribeForge({ onClose, onSaved }: { onClose: () => void; onSaved: (c: CustomTribeConfig) => void }) {
  const existing = loadCustomTribe();
  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? FORGE_COLORS[0].hex);
  const [passive, setPassive] = useState<FactionPassive>(existing?.passive ?? "scholars");
  const [unit, setUnit] = useState<UnitType>(existing?.uniqueUnit ?? "arcanist");
  const [tech, setTech] = useState<TechId>(existing?.startTech ?? "organization");
  const valid = name.trim().length >= 2 && name.trim().length <= 14;

  // v19: remix a preset — load its full config into the forge for editing
  const remix = (cfg: CustomTribeConfig) => {
    sound.play("click");
    setName(cfg.name);
    setColor(cfg.color);
    setPassive(cfg.passive);
    setUnit(cfg.uniqueUnit);
    setTech(cfg.startTech);
  };

  const save = () => {
    if (!valid) return;
    sound.play("click");
    const cfg: CustomTribeConfig = { name: name.trim(), color, passive, uniqueUnit: unit, startTech: tech };
    saveCustomTribe(cfg);
    onSaved(cfg);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0d0d24]/85 p-4 backdrop-blur-sm">
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border-2 bg-[#10102c]/95 p-5 shadow-2xl"
        style={{ borderColor: `${color}66`, boxShadow: `0 0 60px ${color}2e` }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-black tracking-wide text-white">
            <Hammer className="h-5 w-5" style={{ color }} /> TRIBE FORGE
          </h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* v19: preset gallery — pre-rolled tribes to remix */}
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          <Sparkles className="h-3 w-3 text-amber-300" /> Preset gallery — tap to remix
        </p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          {FORGE_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => remix(p.config)}
              className="rounded-md border border-white/10 bg-white/[0.04] p-2 text-left transition-colors hover:bg-white/10"
              style={{ borderLeftWidth: 3, borderLeftColor: p.config.color }}
            >
              <span className="flex items-center gap-1.5 font-display text-xs font-bold text-slate-100">
                <span className="h-2 w-2 rotate-45" style={{ background: p.config.color, boxShadow: `0 0 6px ${p.config.color}` }} />
                {p.title}
              </span>
              <span className="block text-[10px] leading-tight text-slate-400">{p.blurb}</span>
            </button>
          ))}
        </div>

        {/* name + banner color */}
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Tribe name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={14}
          placeholder="e.g. Emberfall"
          className="mb-3 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 font-display text-sm font-bold text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none"
        />
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Banner color</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {FORGE_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => { sound.play("click"); setColor(c.hex); }}
              title={c.name}
              aria-label={c.name}
              className={`h-8 w-8 rotate-45 rounded-sm transition-transform active:scale-90 ${color === c.hex ? "scale-110 ring-2 ring-white" : "opacity-75 hover:opacity-100"}`}
              style={{ background: c.hex, boxShadow: color === c.hex ? `0 0 14px ${c.hex}` : "none" }}
            />
          ))}
          {/* star-gated reward banners — earned by 3-starring every mission in a chapter */}
          {CHAPTER_REWARDS.map((r) => {
            const earned = rewardEarned(r);
            return (
              <button
                key={r.banner.hex}
                onClick={() => { if (!earned) return; sound.play("click"); setColor(r.banner.hex); }}
                title={earned ? `${r.banner.name} — campaign reward` : `${r.banner.name} — earn ${r.starsRequired}★ in ${r.chapterId === "ch1" ? "Chapter I" : "Chapter II"} (${chapterStars(r.chapterId)}/${r.starsRequired})`}
                aria-label={r.banner.name}
                disabled={!earned}
                className={`relative h-8 w-8 rotate-45 rounded-sm transition-transform ${earned ? "active:scale-90" : "cursor-not-allowed"} ${color === r.banner.hex ? "scale-110 ring-2 ring-amber-300" : earned ? "opacity-75 hover:opacity-100" : "opacity-30"}`}
                style={{ background: r.banner.hex, boxShadow: color === r.banner.hex ? `0 0 14px ${r.banner.hex}` : "none" }}
              >
                {!earned && <Lock className="absolute inset-0 m-auto h-3.5 w-3.5 -rotate-45 text-black/70" />}
                {earned && <Star className="absolute inset-0 m-auto h-3 w-3 -rotate-45 fill-black/40 text-black/50" />}
              </button>
            );
          })}
        </div>

        {/* passive */}
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Passive trait</p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          {FORGE_PASSIVES.map((p) => (
            <button
              key={p.id}
              onClick={() => { sound.play("click"); setPassive(p.id); }}
              className={`rounded-md border p-2 text-left transition-colors ${passive === p.id ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-white/[0.04] hover:bg-white/10"}`}
            >
              <span className={`block font-display text-xs font-bold ${passive === p.id ? "text-amber-200" : "text-slate-200"}`}>{p.label}</span>
              <span className="block text-[10px] leading-tight text-slate-400">{p.desc}</span>
            </button>
          ))}
        </div>

        {/* unique unit */}
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Signature unit</p>
        <div className="mb-4 grid grid-cols-2 gap-1.5">
          {FORGE_UNITS.map((ut) => {
            const st = UNIT_STATS[ut];
            return (
              <button
                key={ut}
                onClick={() => { sound.play("click"); setUnit(ut); }}
                className={`rounded-md border p-2 text-left transition-colors ${unit === ut ? "border-violet-400 bg-violet-400/15" : "border-white/10 bg-white/[0.04] hover:bg-white/10"}`}
              >
                <span className={`flex items-center justify-between font-display text-xs font-bold ${unit === ut ? "text-violet-200" : "text-slate-200"}`}>
                  {st.name}
                  <span className="inline-flex items-center gap-0.5 text-amber-300"><Star className="h-3 w-3 fill-amber-300" />{st.cost}</span>
                </span>
                <span className="block text-[10px] leading-tight text-slate-400">{st.perk}</span>
              </button>
            );
          })}
        </div>

        {/* start tech */}
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Starting technology</p>
        <div className="mb-5 grid grid-cols-3 gap-1.5">
          {FORGE_TECHS.map((t) => (
            <button
              key={t.id}
              onClick={() => { sound.play("click"); setTech(t.id); }}
              className={`rounded-md border px-2 py-1.5 font-display text-xs font-bold transition-colors ${tech === t.id ? "border-emerald-400 bg-emerald-400/15 text-emerald-200" : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* live banner preview */}
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-3">
          <span className="h-4 w-4 rotate-45" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          <div>
            <p className="font-display text-sm font-extrabold text-white">{name.trim() || "Unnamed Tribe"}</p>
            <p className="text-[11px] text-slate-400">
              {FORGE_PASSIVES.find((p) => p.id === passive)?.label} · {UNIT_STATS[unit].name} · starts with {FORGE_TECHS.find((t) => t.id === tech)?.label}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {existing && (
            <button
              onClick={() => { sound.play("click"); deleteCustomTribe(); onClose(); }}
              className="flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 font-display text-xs font-bold text-red-300 transition-colors hover:bg-red-400/20"
            >
              <Trash2 className="h-3.5 w-3.5" /> Disband
            </button>
          )}
          <button
            onClick={save}
            disabled={!valid}
            className="flex-1 rounded-lg py-2.5 font-display text-sm font-bold uppercase tracking-[0.2em] text-[#141433] transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: color }}
          >
            {existing ? "Reforge tribe" : "Forge tribe"}
          </button>
        </div>
        {!valid && name.length > 0 && (
          <p className="mt-2 text-center text-[10px] text-red-300">Name must be 2–14 characters.</p>
        )}
      </div>
    </div>
  );
}
