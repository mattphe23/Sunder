// Sunder — Isoglow. Onboarding tutorial: a guided first-turn overlay for new
// commanders. Field-HUD styling (indigo panels, amber accents), advances on the
// player's real actions, skippable, and never shown again once completed.
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/useGame";
import { X, MousePointerClick, Move3D, Flag, FlaskConical, Hourglass, Sparkles, Apple, Landmark, Gift } from "lucide-react";

const DONE_KEY = "polyforge-tutorial-done";
// v36: economy beats appended after the original flow — bump so existing players
// who finished the old tutorial still see the new steps once (keyed separately)
const ECON_DONE_KEY = "polyforge-tutorial-econ-done";

interface Step {
  id: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  /** where to anchor the card so it doesn't cover the relevant UI */
  anchor: "center" | "bottom" | "top";
}

const STEPS: Step[] = [
  {
    id: "welcome",
    icon: <Sparkles size={18} />,
    title: "Welcome, Commander",
    body: "Your capital and a lone warrior await in the Shatterlands. Win by capturing every rival capital — or by leading in score when turn 30 ends. Let's take your first turn together.",
    anchor: "center",
  },
  {
    id: "select",
    icon: <MousePointerClick size={18} />,
    title: "Select your warrior",
    body: "Click the small figure standing on your capital tile. Selected units glow, and every tile they can reach lights up.",
    anchor: "bottom",
  },
  {
    id: "move",
    icon: <Move3D size={18} />,
    title: "March out",
    body: "Click any highlighted ring to move there. Explore toward the fog — villages, ruins, and rivals hide beyond it.",
    anchor: "bottom",
  },
  {
    id: "capture",
    icon: <Flag size={18} />,
    title: "Claim villages",
    body: "When a unit stands on a neutral village, a Capture button appears in its panel. Each city adds stars to your income every turn. (You'll do this when you find one — for now, keep it in mind.)",
    anchor: "bottom",
  },
  {
    id: "research",
    icon: <FlaskConical size={18} />,
    title: "Research technology",
    body: "Open Research (bottom bar) and buy a technology with stars. Techs unlock new units, harvesting, terrain movement — and their cost grows with your empire, so early picks matter.",
    anchor: "top",
  },
  {
    id: "harvest",
    icon: <Apple size={18} />,
    title: "Feed your cities",
    body: "Stars win battles; population wins the long game. Click your capital and use Harvest to gather fruit, game, or minerals around it — each adds population, and every 3 population levels the city up for more income.",
    anchor: "bottom",
  },
  {
    id: "build",
    icon: <Landmark size={18} />,
    title: "Build for position",
    body: "The city panel also offers buildings: Lumber Huts on forest, Farms on grass, Mines on mountains. Sawmills and Windmills gain +1 population per adjacent Hut or Farm — placement is a puzzle, so cluster before you crown.",
    anchor: "bottom",
  },
  {
    id: "reward",
    icon: <Gift size={18} />,
    title: "Level-up rewards",
    body: "Each city level offers a choice of two rewards — Workshop income, walls, border growth, and at level 5 the big one: a Park worth 15 score, or a Colossus that crushes city walls and hurls defenders back. Choose for the war you're fighting.",
    anchor: "center",
  },
  {
    id: "endturn",
    icon: <Hourglass size={18} />,
    title: "End your turn",
    body: "Press End Turn (bottom-right) when your units have acted. The three rival powers move next — a recap will show anything you missed in the fog. Good hunting, Commander.",
    anchor: "bottom",
  },
];

export function isTutorialDone(): boolean {
  try { return localStorage.getItem(DONE_KEY) === "1"; } catch { return true; }
}

/** v36: players who completed the pre-economy tutorial see only the new beats once */
function econOnlyStart(): number {
  try {
    if (localStorage.getItem(DONE_KEY) === "1" && localStorage.getItem(ECON_DONE_KEY) !== "1") {
      return STEPS.findIndex((st) => st.id === "harvest");
    }
  } catch { /* private mode */ }
  return 0;
}

export function Tutorial() {
  const g = useGame();
  const s = g.state;
  const [step, setStep] = useState(() => econOnlyStart());
  const [active, setActive] = useState(() => {
    try {
      return localStorage.getItem(DONE_KEY) !== "1" || localStorage.getItem(ECON_DONE_KEY) !== "1";
    } catch { return false; }
  });
  // remember warrior position at select-time to detect the move
  const posRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const finish = () => {
    try {
      localStorage.setItem(DONE_KEY, "1");
      localStorage.setItem(ECON_DONE_KEY, "1");
    } catch { /* private mode */ }
    setActive(false);
  };

  // action-driven advancement
  useEffect(() => {
    if (!active || s.phase !== "playing") return;
    const cur = STEPS[step]?.id;
    if (cur === "select" && s.selectedUnitId !== null) {
      const u = s.units.find((x) => x.id === s.selectedUnitId);
      if (u && u.tribe === s.humanTribe) {
        posRef.current = { id: u.id, x: u.x, y: u.y };
        setStep(step + 1);
      }
    } else if (cur === "move" && posRef.current) {
      const u = s.units.find((x) => x.id === posRef.current!.id);
      if (u && (u.x !== posRef.current.x || u.y !== posRef.current.y)) setStep(step + 1);
    } else if (cur === "research" && s.tribes[s.humanTribe]?.techs.length > 1) {
      // started with 1 tech; a second means research happened
      setStep(step + 1);
    } else if (cur === "harvest") {
      // advance when the player opens a city panel (they can see Harvest there)
      if (s.selectedCityId !== null) setStep(step + 1);
    } else if (cur === "endturn" && s.turn > 1) {
      finish();
    }
  });

  if (!active || s.phase !== "playing") return null;
  // hot-seat games skip the guided tutorial — it targets a single commander
  if ((s.humanTribes?.length ?? 1) > 1) return null;
  const cur = STEPS[step];
  if (!cur) return null;

  const anchorCls =
    cur.anchor === "center"
      ? "inset-0 items-center justify-center"
      : cur.anchor === "top"
        ? "inset-x-0 top-16 justify-center"
        : "inset-x-0 bottom-24 justify-center";

  return (
    <div className={`pointer-events-none absolute z-40 flex px-4 ${anchorCls}`}>
      <div className="pointer-events-auto w-full max-w-md rounded-lg border border-amber-400/40 bg-[#1a1a3e]/95 p-4 shadow-[0_0_30px_rgba(255,185,56,0.15)] backdrop-blur">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-amber-300">
            {cur.icon}
            <span className="font-display text-sm font-bold uppercase tracking-widest">{cur.title}</span>
          </div>
          <button
            onClick={finish}
            aria-label="Skip tutorial"
            className="rounded p-1 text-indigo-300/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-indigo-100/90">{cur.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((st, i) => (
              <span
                key={st.id}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${i === step ? "bg-amber-400" : i < step ? "bg-amber-400/50" : "bg-white/20"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={finish}
              className="rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300/70 transition-colors hover:text-white"
            >
              Skip
            </button>
            {(cur.id === "welcome" || cur.id === "capture") && (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#141433] transition-transform active:scale-95"
              >
                {cur.id === "welcome" ? "Let's go" : "Got it"}
              </button>
            )}
            {(cur.id === "harvest" || cur.id === "build" || cur.id === "reward") && (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded bg-amber-400 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#141433] transition-transform active:scale-95"
              >
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
