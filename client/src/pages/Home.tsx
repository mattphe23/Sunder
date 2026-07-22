// Polyforge — Isoglow. Full-viewport game: menu → board → game over.
import { useState } from "react";
import { useGame } from "@/game/useGame";
import GameCanvas from "@/game/GameCanvas";
import { MainMenu, GameOver } from "@/game/ui/Menu";
import { TopBar, BottomBar, SelectionPanel, TechPanel, LogTicker, BattlePreview, TurnRecap } from "@/game/ui/Hud";
import { Minimap } from "@/game/ui/Minimap";

export default function Home() {
  const g = useGame();
  const s = g.state;
  const [techOpen, setTechOpen] = useState(false);

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
      {s.phase === "gameover" && <GameOver />}
    </div>
  );
}
