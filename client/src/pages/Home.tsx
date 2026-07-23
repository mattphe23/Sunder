// Sunder — Isoglow. Full-viewport game: menu → board → game over.
import { useEffect, useState } from "react";
import { useGame } from "@/game/useGame";
import GameCanvas from "@/game/GameCanvas";
import { sound } from "@/game/sound";
import { MainMenu, GameOver } from "@/game/ui/Menu";
import { TopBar, BottomBar, SelectionPanel, TechPanel, LogTicker, BattlePreview, TurnRecap, PerkChoice } from "@/game/ui/Hud";
import { Minimap } from "@/game/ui/Minimap";
import { Tutorial } from "@/game/ui/Tutorial";
import { FactionIntro } from "@/game/ui/FactionIntro";
import { HandoffScreen } from "@/game/ui/Handoff";
import { DiplomacyPanel, IncomingOfferModal } from "@/game/ui/Diplomacy";
import { WorldEventCards, HeroFallenCard } from "@/game/ui/WorldEvents";
import { OnlineGame } from "@/game/online/OnlineGame";

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
      <GameCanvas />
      <TopBar />
      <LogTicker />
      <Minimap />
      <SelectionPanel />
      <BattlePreview />
      <TurnRecap />
      <PerkChoice />
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
