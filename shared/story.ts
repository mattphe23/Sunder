// Story Mode — Chapter I: The Sundering.
// A thin campaign layer over the standard engine: each mission is a seed-locked
// match with a scripted roster, difficulty, and win objective, chained with
// narrative interludes. Gated by the `story.ch1` entitlement (or Ultimate).

export type StoryObjective =
  | { kind: "domination"; text: string } // win the match by any means
  | { kind: "survive"; turns: number; text: string } // still alive when the score screen fires
  | { kind: "capital"; text: string }; // treated as domination (capitals fall when tribes fall)

export interface StoryMission {
  id: string; // "ch1-m1" ...
  index: number; // 0-based order within the chapter
  title: string;
  subtitle: string;
  /** shown before the match */
  intro: string[];
  /** shown when the mission is completed */
  victoryText: string;
  /** seed-locked board */
  seed: number;
  preset: "continents" | "pangaea" | "highlands" | "archipelago";
  size: number;
  /** TRIBE_DEFS indices for the AI antagonists (slot order after the player) */
  enemies: number[];
  difficulty: "easy" | "normal" | "hard";
  objective: StoryObjective;
}

export interface StoryChapter {
  id: string;
  title: string;
  tagline: string;
  entitlementKey: string;
  missions: StoryMission[];
}

export const CHAPTER_1: StoryChapter = {
  id: "ch1",
  title: "Chapter I — The Sundering",
  tagline: "The Shatterlands remember who broke them. Lead your tribe through the wound the old world left behind.",
  entitlementKey: "story.ch1",
  missions: [
    {
      id: "ch1-m1",
      index: 0,
      title: "Embers of the Forge",
      subtitle: "A first foothold",
      intro: [
        "The Sundering split the world into drifting shards, and your people awoke on the smallest of them.",
        "An Auren remnant claims the far ridge. They call your banner an omen. Prove them right.",
      ],
      victoryText: "The ridge is yours. Scouts speak of greener shards beyond the mist — and of the Kharzul, who got there first.",
      seed: 90101,
      preset: "pangaea",
      size: 9,
      enemies: [0],
      difficulty: "easy",
      objective: { kind: "domination", text: "Defeat the Auren remnant" },
    },
    {
      id: "ch1-m2",
      index: 1,
      title: "The Ashen Marches",
      subtitle: "Two banners, one valley",
      intro: [
        "The Kharzul forge-lords burn the valley ahead to feed their armies. The Sunwei caravans flee before them.",
        "Take the marches before the ash settles — fight on two fronts and hold your nerve.",
      ],
      victoryText: "The forges of the marches now answer to you. But the sea calls: the Vessari fleet has found your coast.",
      seed: 90202,
      preset: "highlands",
      size: 11,
      enemies: [1, 2],
      difficulty: "normal",
      objective: { kind: "domination", text: "Defeat the Kharzul and the Sunwei" },
    },
    {
      id: "ch1-m3",
      index: 2,
      title: "The Long Tide",
      subtitle: "Hold until the storm breaks",
      intro: [
        "The Vessari outriders strike from the water faster than word can travel. Your walls are unfinished, your levies raw.",
        "You cannot beat their fleet — yet. Survive the long tide, and the storm itself will scatter them.",
      ],
      victoryText: "The tide withdrew, and your banner still stood. What the Vessari abandoned, your shipwrights claimed.",
      seed: 90303,
      preset: "archipelago",
      size: 11,
      enemies: [3, 5],
      difficulty: "hard",
      objective: { kind: "survive", turns: 30, text: "Survive to the final turn (outlast the score screen)" },
    },
    {
      id: "ch1-m4",
      index: 3,
      title: "The Drowned Throne",
      subtitle: "Strike the head",
      intro: [
        "Across the strait, the Nerivane tide-priests crown a new Deepmother beneath their capital's coral spires.",
        "End the coronation. Take their capital, and their congregation dissolves like salt in rain.",
      ],
      victoryText: "The coral throne cracked, and with it the Deepmother's hold on the shards. One power remains — and it is not of the old world.",
      seed: 90404,
      preset: "continents",
      size: 11,
      enemies: [4, 5],
      difficulty: "hard",
      objective: { kind: "capital", text: "Conquer the Nerivane and their allies" },
    },
    {
      id: "ch1-m5",
      index: 4,
      title: "The Living Forge",
      subtitle: "Reforge the world",
      intro: [
        "At the heart of the Shatterlands the old Forge still burns, and around it three great hosts have gathered: storm, spore, and stone.",
        "Whoever feeds the Forge reforges the world in their image. Build. Conquer. Reforge.",
      ],
      victoryText: "The Forge accepted your offering. The shards begin to knit — slowly, the way all true things are made. Chapter II is coming.",
      seed: 90505,
      preset: "continents",
      size: 13,
      enemies: [6, 7, 5],
      difficulty: "hard",
      objective: { kind: "domination", text: "Defeat the storm, the spore, and the stone" },
    },
  ],
};

/** All chapters (future chapters append here). */
export const STORY_CHAPTERS: StoryChapter[] = [CHAPTER_1];

export function missionById(id: string): StoryMission | null {
  for (const ch of STORY_CHAPTERS) {
    const m = ch.missions.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}
