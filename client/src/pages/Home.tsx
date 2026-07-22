// Polyforge — Isoglow. Full-viewport game: menu → board → game over.
import { useEffect, useState } from "react";
import { useGame } from "@/game/useGame";
import GameCanvas from "@/game/GameCanvas";
import { sound } from "@/game/sound";
import { MainMenu, GameOver } from "@/game/ui/Menu";
import { TopBar, BottomBar, SelectionPanel, TechPanel, LogTicker, BattlePreview, TurnRecap } from "@/game/ui/Hud";
import { Minimap } from "@/game/ui/Minimap";
import { Tutorial } from "@/game/ui/Tutorial";
import { FactionIntro } from "@/game/ui/FactionIntro";
import { HandoffScreen } from "@/game/ui/Handoff";

export default function Home() {
  const g = useGame();
  const s = g.state;
  const [techOpen, setTechOpen] = useState(false);

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
      <BottomBar onOpenTech={() => setTechOpen(true)} />
      <TechPanel open={techOpen} onClose={() => setTechOpen(false)} />
      <Tutorial />
      <FactionIntro />
      <HandoffScreen />
      {s.phase === "gameover" && <GameOver />}
    </div>
  );
}
