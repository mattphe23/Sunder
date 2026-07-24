// Story Mode — Chapter I: The Sundering & Chapter II: The Reforging.
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
  /**
   * Star ratings: 1★ complete the objective, 2★ also finish by this turn
   * (0-based turn index, matches GameState.turn), 3★ also lose no city.
   * For survive missions "finish" is the survival itself, so par is judged on
   * cities kept + units lost instead; we still store parTurns for uniformity.
   */
  parTurns: number;
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
      parTurns: 14,
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
      parTurns: 20,
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
      parTurns: 29,
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
      parTurns: 24,
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
      parTurns: 27,
    },
  ],
};

// Chapter II — The Reforging. The Forge accepted the player's offering at the
// end of Chapter I; now the knitting shards drag old enemies back into one
// world, and everyone remembers exactly who put them there. Included with the
// same `story.ch1` entitlement (one Story Mode purchase = whole campaign) and
// unlocked by finishing the Chapter I finale.
export const CHAPTER_2: StoryChapter = {
  id: "ch2",
  title: "Chapter II — The Reforging",
  tagline: "The shards are knitting back into one world — and every rival you humbled now shares a border with you again.",
  entitlementKey: "story.ch1",
  missions: [
    {
      id: "ch2-m1",
      index: 0,
      title: "The Seam",
      subtitle: "Where two shards meet",
      intro: [
        "The Forge burns at the heart of the world, and the shards drift toward it like iron to a lodestone. Where two shards touch, the land fuses into a raw scar of new ground — the Seam.",
        "Your surveyors reached the first Seam at dawn. The Kharzul reached it at midnight. Their forge-lords believe the new land belongs to whoever brands it first, and they have brought a great deal of fire to make the argument.",
      ],
      victoryText: "The Seam holds your banner, and the fused earth is already sprouting green. But the tide-priests you broke at the Drowned Throne have found something in the deep water between shards — something that sings.",
      seed: 91101,
      preset: "pangaea",
      size: 11,
      enemies: [1],
      difficulty: "normal",
      objective: { kind: "domination", text: "Drive the Kharzul from the Seam" },
      parTurns: 16,
    },
    {
      id: "ch2-m2",
      index: 1,
      title: "The Deepmother's Echo",
      subtitle: "What the water remembers",
      intro: [
        "The coral throne cracked, but coral grows back. In the black water between the knitting shards, the surviving tide-priests raised an Echo of their Deepmother — and half the Vessari fleet, hungry for plunder, sails under her new song.",
        "They mean to drown the Seams and keep the world in pieces, because a broken world has more coastline to rule. Take the fight across the straits before their choir grows to a roar.",
      ],
      victoryText: "The Echo's song ended in salt and silence. From the wreckage your shipwrights pulled charts of the far shards — and on them, drawn in storm-blue ink, a fortress called the Spire.",
      seed: 91202,
      preset: "archipelago",
      size: 11,
      enemies: [4, 3],
      difficulty: "normal",
      objective: { kind: "domination", text: "Silence the Nerivane Echo and her Vessari privateers" },
      parTurns: 22,
    },
    {
      id: "ch2-m3",
      index: 2,
      title: "The Stormglass Spire",
      subtitle: "Weather the unweatherable",
      intro: [
        "The Valkyra never forgave you for the Living Forge. From their Stormglass Spire they have learned to pull lightning out of the Sundering itself, and now the sky above your borders turns the color of a bruise.",
        "You cannot take the Spire — not yet. Their stormline must break against your walls first. Dig in, hold every city, and let them spend their thunder.",
      ],
      victoryText: "The storm spent itself against your stones. When the clouds finally tore open, your scouts saw the Spire dark and the Valkyra in retreat — through a forest that had not been there the week before.",
      seed: 91303,
      preset: "highlands",
      size: 11,
      enemies: [6, 5],
      difficulty: "hard",
      objective: { kind: "survive", turns: 30, text: "Survive the Valkyra stormline to the final turn" },
      parTurns: 29,
    },
    {
      id: "ch2-m4",
      index: 3,
      title: "The Verdant Rot",
      subtitle: "The forest that walks",
      intro: [
        "The Mycelon did not retreat after the Forge. They went under. Every Seam the world knits, their spores knit faster — a green rot that eats farmland, fills ruins, and hollows out villages overnight.",
        "Their sporemother has rooted her capital in the deep mycelium where the rot is thickest. Burn a road to it and cut the heart out of the forest that walks.",
      ],
      victoryText: "The sporemother's crown collapsed into ash and pale dust, and for the first time in a season the wind smelled of nothing at all. Only the Forge remains — and around it, every banner you have ever broken, sworn to one last cause: yours never reaching it again.",
      seed: 91404,
      preset: "continents",
      size: 11,
      enemies: [7, 2],
      difficulty: "hard",
      objective: { kind: "capital", text: "Destroy the Mycelon sporemother and her Sunwei suppliers" },
      parTurns: 24,
    },
    {
      id: "ch2-m5",
      index: 4,
      title: "The Crucible",
      subtitle: "One world, one forge, one victor",
      intro: [
        "The last Seams are closing. By the next moon there will be one world again, and the Forge at its heart will cool into whatever shape the final hand gives it.",
        "Auren scholars, Vessari outriders, and Dravok stonemasons have set aside a hundred years of grudges to stop you. They call their pact the Crucible, and they mean for you to burn in it. Prove instead that you are the thing crucibles make.",
      ],
      victoryText: "The Forge cooled with your hand upon it, and the world it made is whole — scarred, but whole, the way all true things are made. The Shatterlands are only 'lands' now. What your people build on them is the next story.",
      seed: 91505,
      preset: "continents",
      size: 13,
      enemies: [0, 3, 5],
      difficulty: "hard",
      objective: { kind: "domination", text: "Break the Crucible pact and claim the reforged world" },
      parTurns: 28,
    },
  ],
};

/** All chapters (future chapters append here). */
export const STORY_CHAPTERS: StoryChapter[] = [CHAPTER_1, CHAPTER_2];

export function missionById(id: string): StoryMission | null {
  for (const ch of STORY_CHAPTERS) {
    const m = ch.missions.find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}
