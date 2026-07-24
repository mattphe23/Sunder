// Sunder — tribe skin picker. Owned skins restyle a standard tribe's units
// (costume accent + unit color). Selection persists locally and applies to
// the Babylon renderer via setActiveSkins(); ownership comes from the store.
import { useEffect, useState } from "react";
import { SKINS, SkinDef, setActiveSkins } from "@/game/render/characters";
import { TRIBE_DEFS } from "@/game/core/types";
import { useEntitlements } from "@/hooks/useEntitlements";
import { sound } from "../sound";
import { Lock, Check, X, Paintbrush } from "lucide-react";
import { Link } from "wouter";

const KEY = "sunder-active-skins-v1";

export function loadActiveSkins(): Record<number, string | undefined> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<number, string | undefined>) : {};
  } catch { return {}; }
}

function saveActiveSkins(map: Record<number, string | undefined>) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch { /* noop */ }
}

/** call once at startup so saved skins style the first board build */
export function initActiveSkins(ownedKeys: string[]) {
  const saved = loadActiveSkins();
  // drop selections whose entitlement is gone (refund, different account)
  const valid: Record<number, string | undefined> = {};
  for (const [k, v] of Object.entries(saved)) {
    if (v && ownedKeys.includes(v)) valid[Number(k)] = v;
  }
  setActiveSkins(valid);
  return valid;
}

export function SkinsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ent = useEntitlements();
  const [active, setActive] = useState<Record<number, string | undefined>>(() => loadActiveSkins());

  // re-validate whenever entitlements arrive
  useEffect(() => {
    if (!ent.loading) setActive(initActiveSkins(ent.keys));
  }, [ent.loading, ent.keys.join(",")]);

  if (!open) return null;

  const pick = (skin: SkinDef, owned: boolean) => {
    if (!owned) return;
    sound.play("click");
    const next = { ...active, [skin.tribe]: active[skin.tribe] === skin.key ? undefined : skin.key };
    setActive(next);
    saveActiveSkins(next);
    setActiveSkins(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0d24]/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a3e]/95 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-black uppercase tracking-wide text-white">
            <Paintbrush className="h-4 w-4 text-amber-300" /> Tribe Skins
          </h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[12px] leading-snug text-slate-300">
          Restyle a tribe's warband — new war-paint and battle colors. Owned skins toggle on and off; the change shows on every unit in your next battle.
        </p>
        <div className="flex flex-col gap-2">
          {SKINS.map((skin) => {
            const owned = ent.has(skin.key);
            const selected = active[skin.tribe] === skin.key;
            const tribe = TRIBE_DEFS[skin.tribe];
            return (
              <button
                key={skin.key}
                onClick={() => pick(skin, owned)}
                disabled={!owned}
                className={`relative flex items-center gap-3 rounded-md border-l-4 p-3 text-left transition-all duration-150 ${owned ? "active:scale-[0.98]" : "opacity-60"} ${selected ? "bg-white/10" : "bg-white/[0.04] hover:bg-white/10"}`}
                style={{
                  borderLeftColor: skin.unitColor ?? skin.accent,
                  boxShadow: selected ? `0 0 16px ${skin.accent}44, inset 0 0 0 1px ${skin.accent}66` : "inset 0 0 0 1px rgba(255,255,255,0.08)",
                }}
              >
                {/* swatch pair: unit color + accent */}
                <span className="flex shrink-0 items-center">
                  <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: skin.unitColor ?? tribe.color }} />
                  <span className="-ml-2 h-6 w-6 rounded-full border border-white/20" style={{ background: skin.accent }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-extrabold tracking-wide text-white">{skin.name}</span>
                  <span className="block text-[11px] text-slate-400">for {tribe.name}</span>
                </span>
                {owned ? (
                  selected && <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                ) : (
                  <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                )}
              </button>
            );
          })}
        </div>
        {!ent.hasAll(SKINS.map((s) => s.key)) && (
          <Link
            href="/store"
            className="mt-4 block rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-center font-display text-xs font-bold uppercase tracking-wide text-amber-200 hover:bg-amber-400/20"
          >
            Get more skins in the Store
          </Link>
        )}
      </div>
    </div>
  );
}
