# Polyforge v5 — Great Ruins + Score Breakdown

## 1. Great ruins (guarded, bigger rewards)
- [x] types.ts: Tile.greatRuin flag; neutral guardian concept (unit.guardian flag, GUARDIAN_TRIBE=-1)
- [x] mapgen.ts: 1 great ruin per map (2 on 13×13), on land, far from all capitals
- [x] state.ts: guardian spawn, big reward roll, recap entries, guardian-slain log
- [x] rules.ts: guardians attackable (tribe !== check), defensive -1 guards, +1.4 def bonus
- [x] ai.ts: AI values great ruins; attacks guardian when kill is close
- [ ] scene.ts: distinct rendering — golden twin-obelisk monument + guardian mesh
- [x] recap: rival great-ruin claims appear in recap

## 2. Score breakdown screen
- [ ] state.ts: record per-faction score history each turn (scoreHistory: number[][])
- [ ] persist scoreHistory in save/restore
- [ ] GameOver: recharts line chart of score trajectories in faction colors + ranked final scores

## 3. Verify & deliver
- [ ] TS check + headless sim
- [ ] Browser: guardian blocks ruin until killed, big reward on claim; chart renders on game over
- [ ] Clear test save, checkpoint, deliver
