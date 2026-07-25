// Sunder — Isoglow. Full-viewport game: menu → board → game over.
import { lazy, Suspense, useEffect, useState } from "react";
import { useGame } from "@/game/useGame";
import { sound } from "@/game/sound";
import { MainMenu, GameOver } from "@/game/ui/Menu";
import { TopBar, BottomBar, SelectionPanel, TechPanel, LogTicker, BattlePreview, TurnRecap, PerkChoice, CityRewardChoice } from "@/game/ui/Hud";
import { Minimap } from "@/game/ui/Minimap";
import { Tutorial } from "@/game/ui/Tutorial";
import { FactionIntro } from "@/game/ui/FactionIntro";
import { HandoffScreen } from "@/game/ui/Handoff";
import { DiplomacyPanel, IncomingOfferModal } from "@/game/ui/Diplomacy";
import { WorldEventCards, HeroFallenCard } from "@/game/ui/WorldEvents";
import { OnlineGame } from "@/game/online/OnlineGame";

// Babylon (~5MB minified) loads as its own async chunk only when a game
// starts — keeps the menu snappy and the entry bundle small for deploys.
const GameCanvas = lazy(() => import("@/game/GameCanvas"));

export default function Home() {
  const g = useGame();
  const s = g.state;
  const [techOpen, setTechOpen] = useState(false);
  const [diploOpen, setDiploOpen] = useState(false);

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
        <GameCanvas />
      </Suspense>
      <TopBar />
      <LogTicker />
      <Minimap />
      <SelectionPanel />
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
      {s.phase === "gameover" && <GameOver />}
    </div>
  );
}
