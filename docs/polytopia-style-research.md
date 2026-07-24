# Research notes: Polytopia's visual style (for graphics roadmap doc)

## Sources
- Official assets page: https://polytopia.io/game-graphics/ — Midjiwan publishes free
  creative assets (Buildings, Tribes, Units, Symbols sprites) via Google Drive, with brand
  guidelines at polytopia.io/brand-assets-guide-lines/. NOTE: usable for "cool stuff" per their
  wording, but a competing game should NOT lift their assets — style reference only.
- Polysthetic modelling breakdown (fan recreation in Blender, 2019):
  https://polysthetic.com/game-of-thrones-intro-battle-of-polytopia/
  Key technical observations from someone who rebuilt the art in 3D:
  * Terrain = only THREE tile models, recolored per tribe/biome. Tiny asset vocabulary.
  * ~15 models per tribe covers everything incl. mountain + trees (each tribe reskins
    mountains/trees/buildings — biome identity via recolor + swap, not new geometry).
  * Original game art is DRAWN (2D sprites with impossible geometry), not real 3D models —
    "these models were drawn directly, rather than modelled... a lot of impossible geometry".
  * Materials: flat solid colors on nearly everything; no textures except tiny accents.
  * Cities = stacked "monolithic Jenga towers" of house blocks.
  * The "miniature/toy" look in renders came from: shallow DOF, bloom/glare — compositing.
- Pixelated Playgrounds design analysis:
  https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-the-battle-of-polytopia
  (mostly game design; confirms readability-first minimalism philosophy)

## Distilled visual pillars of Polytopia
1. Tiny, ruthlessly consistent asset vocabulary (3 terrain tiles, ~15 models/tribe), recolors
   over new geometry. Consistency IS the style.
2. Flat solid colors, no gradients/textures; one color per face; strong silhouette.
3. Faceted low-poly with clean bevels; "drawn" charm — slightly exaggerated proportions,
   impossible geometry OK.
4. Per-tribe reskin of the whole world (trees/mountains/houses change per tribe biome).
5. Square tiles read as chunky 3D slabs; city = stacking house blocks per population.
6. Lighting: essentially unlit / uniform; shadows minimal, color does the modeling work.
7. Miniature diorama feel: slight DOF/bloom in marketing renders; in-game it's clean flat.
8. Motion: chunky discrete animations (units hop, spin), sprite-flip character style.
9. UI: flat, minimal, integrated color palette.

## Sunder current state (from scene.ts work done in v24)
- Babylon.js real 3D: box tiles, cone/sphere trees w/ trunks, snow-capped mountains,
  fruit/animal/crystal meshes, city plates + roofed houses, port sails, fog-cloud tiles,
  indigo fog wash, StandardMaterial + hemispheric/dir light, shadows, DefaultRenderingPipeline
  (bloom etc.), particles. Look: decent low-poly but generic — lacks Polytopia's consistency,
  per-tribe reskins, palette discipline, character units (units are primitive shapes),
  chunky animations.

## Honest gap analysis (draft)
- Biggest gaps to "Polytopia level": (1) unit CHARACTERS (heads/bodies/weapons per tribe) vs
  abstract shapes; (2) per-tribe world reskin; (3) palette discipline + flat shading style
  pass; (4) cohesive tile slab look with beveled edges; (5) chunky animation language;
  (6) city growth as stacking blocks; (7) polish FX (attack pops, capture bursts).
- What's achievable in-code with Babylon (no external artist): quite a lot — procedural
  low-poly meshes + flat-shaded materials + palette tokens; hardest part is unit character
  modeling ~ can approximate with composed primitives (Polytopia units are themselves
  simple: ball head + torso + weapon).
- Alternative: AI-generated sprite billboards — risks style inconsistency; procedural mesh
  approach keeps everything coherent.

## Concrete observations from screenshots (inspected 2 refs)
Wide shot (1920x1080 full map, Perfection endgame):
- The WORLD READS AS A FLAT PAINTED QUILT: terrain tops are perfectly flat planes of
  saturated color (grass = 2-3 greens, desert = golden yellow, water = 2 blues + pale
  shallow band). Zero visible lighting gradient across the board — color IS the lighting.
- Cloud/fog band: unexplored = white faceted "crumpled paper" triangulated surface, NOT
  dark. Bright, friendly. Big deal: our indigo fog is the opposite mood.
- Tile edges: land masses are extruded slabs with slightly darker side walls; coastline
  gets a thin lighter water band (shallows) hugging the land.
- Borders: tribe territory marked by dashed/striped ribbons in tribe color along tile
  edges (very readable ownership).
- Cities: dense clusters of tiny beveled houses; capital has taller tower stack. City
  bar (name + population pips) floats above.
- Fields/farms as tiny orange/checker rows; forests = rows of small stylized trees with
  visible trunk + layered canopy; palm trees in desert biome.
- Mountains: faceted pyramids, white/gray with colored base tones per biome.
- Roads: pale paths connecting cities, drawn on tile tops.
Close shot (1280x720):
- Units are CHARACTERS: leopard-print giraffe (Zebasi super unit?), archers with hoods,
  boats with striped sails carrying the unit on deck. Every unit = head + body + weapon
  + tribe costume; sits on a small colored base block matching tribe color.
- Houses: tiny boxes with pitched roofs, 2-tone walls, chimneys; harbor = plank docks.
- Health bars: white shield-shaped badges with numbers above units. Action icons in
  beige circles (arrow, house, flag) — flat pictograms.
- Water: flat blue with paler wave squiggle lines drawn on; fish = simple dark fins.
- Everything casts NO real shadow; depth via color value steps only (some AO-ish
  darkening under city clusters).
- Palette is extremely saturated & warm; whites are cream, not pure.

## Sunder-side audit (current build, July 24)
- Menu look: dark indigo fantasy theme (painted background, gold accents) — polished but a
  completely different mood from Polytopia's bright/pastel toy world. That's FINE (own
  identity), roadmap should frame goal as "Polytopia-LEVEL clarity/cohesion", not copying.
- In-game screenshots from v24 verification (previous phase, already inspected): board has
  box tiles + slab sides, two-tone trees w/ trunks, snow-capped mountains, fruit/animal/
  crystal meshes, city plates + roofed houses, fog-cloud tiles, indigo fog wash. Good
  readability now but vs Polytopia refs the gaps are:
  1. UNITS are abstract primitives (no characters w/ head/body/weapon/costume) — biggest gap
  2. No per-tribe world reskin (Polytopia recolors trees/mountains/houses per tribe)
  3. Real 3D lighting + shadows + bloom vs Polytopia's flat unlit color style — Sunder has
     lighting gradients across tile tops; Polytopia tops are perfectly flat color planes
  4. No territory border ribbons on tile edges (ownership only via city plates)
  5. Cities don't grow visually (Polytopia stacks houses with population)
  6. No roads/paths, no shallow-water coast band, no wave squiggles/fish accents
  7. Animation language: Sunder has smooth tweens; Polytopia uses chunky hops/pops
- NOTE (dev QoL bug found during audit, do NOT fix now): starting a game programmatically
  via __polyforge.newGame renders a blank board until reload — menu-flow starts are fine.
  Real users unaffected. Logged here for awareness.
