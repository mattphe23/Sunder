// Sunder — Isoglow. Full-viewport game: menu → board → game over.
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useGame } from "@/game/useGame";
import { sound } from "@/game/sound";
import { MainMenu, GameOver } from "@/game/ui/Menu";
import { TopBar, BottomBar, SelectionPanel, TechPanel, BattlePreview, TurnRecap, PerkChoice, CityRewardChoice } from "@/game/ui/Hud";
import { GameHudRail } from "@/game/ui/GameHudRail";
import { Tutorial } from "@/game/ui/Tutorial";
import { FactionIntro } from "@/game/ui/FactionIntro";
import { HandoffScreen } from "@/game/ui/Handoff";
import { DiplomacyPanel, IncomingOfferModal } from "@/game/ui/Diplomacy";
import { WorldEventCards, HeroFallenCard } from "@/game/ui/WorldEvents";
import { OnlineGame } from "@/game/online/OnlineGame";
import { useCinema } from "@/game/render/cinema";
import { ResourceActionPanel } from "@/game/ui/ResourceActionPanel";
import type { ResourcePosition } from "@/game/ui/resourceAction";

// Babylon (~5MB minified) loads as its own async chunk only when a game
// starts — keeps the menu snappy and the entry bundle small for deploys.
const GameCanvas = lazy(() => import("@/game/GameCanvas"));

export default function Home() {
  const g = useGame();
  const s = g.state;
  const [techOpen, setTechOpen] = useState(false);
  const [diploOpen, setDiploOpen] = useState(false);
  const [resourceTile, setResourceTile] = useState<ResourcePosition | null>(null);
  const closeResource = useCallback(() => setResourceTile(null), []);
  useEffect(() => setResourceTile(null), [s.phase, s.seed, s.currentTribe, s.humanTribe]);
  useEffect(() => {
    if (s.selectedUnitId !== null || s.selectedCityId !== null) setResourceTile(null);
  }, [s.selectedUnitId, s.selectedCityId]);
  // The engine flips to "gameover" before the match-ending cinematic has drawn
  // a frame, so the victory screen used to bury the best moment in the game.
  // The state change stands; the presentation waits. See render/cinema.ts.
  const cinematic = useCinema();

  // ambient music: plays on the menu, fades out in-game; kick() satisfies autoplay policies
  useEffect(() => {
    if (s.phase === "menu") sound.playMenuMusic();
    else sound.stopMenuMusic();
  }, [s.phase]);
  useEffect(() => {
    const kick = () => sound.kick();
    window.addEventListener("pointerdown", kick);
    return () => window.removeEventListener("pointerdown", kick);
  }, []);

  if (s.phase === "menu") return <MainMenu />;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#141433]">
      <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-indigo-200/70 text-sm tracking-widest">FORGING THE WORLD…</div>}>
        <GameCanvas onInspectResource={setResourceTile} />
      </Suspense>
      <TopBar />
      <GameHudRail />
      {resourceTile
        ? <ResourceActionPanel position={resourceTile} onClose={closeResource} />
        : <SelectionPanel onInspectResource={setResourceTile} />}
      <BattlePreview />
      <TurnRecap />
      <PerkChoice />
      <CityRewardChoice />
      <WorldEventCards />
      <HeroFallenCard />
      <OnlineGame />
      <BottomBar onOpenTech={() => setTechOpen(true)} onOpenDiplo={() => setDiploOpen(true)} />
      <TechPanel open={techOpen} onClose={() => setTechOpen(false)} />
      <DiplomacyPanel open={diploOpen} onClose={() => setDiploOpen(false)} />
      <Tutorial />
      <FactionIntro />
      <HandoffScreen />
      <IncomingOfferModal />
      {s.phase === "gameover" && !cinematic && <GameOver />}
    </div>
  );
}
