// App Store screenshot rig.
//
// Differs from the verification rigs in two ways that matter:
//   1. The UI STAYS VISIBLE. These frames show what the app looks like in the
//      hand, not an isolated renderer.
//   2. ?fx=full, so the pipeline is not stripped. Headless Chromium runs on
//      SwiftShader, which trips setupAdaptiveQuality's software-GL branch and
//      disposes bloom, vignette and shadows before the first frame. Without it
//      every store screenshot ships the board WITHOUT its post-processing.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Apple's portrait pixel sizes, verified against the App Store Connect spec.
// CSS box x DPR lands exactly on them. Everything smaller is auto-scaled by
// App Store Connect from these two, so two sets is the whole requirement.
const DEVICES = {
  iphone: { w: 440, h: 956, dpr: 3 },    // 6.9" -> 1320 x 2868
  ipad:   { w: 1032, h: 1376, dpr: 2 },  // 13"  -> 2064 x 2752
};

const TARGET = process.argv[2] || 'iphone';
const SEED = 20260907;
// How deep a match to play before capturing. The AI rolls live (see the
// Math.random note in addInitScript), so the same seed does NOT give the same
// match across browser builds: on one Chromium the match ran past turn 14, on
// another Kharzul won outright at turn 10. Lower this if a run ends early.
const TURNS = Number(process.env.SUNDER_TURNS || 14);
const dev = DEVICES[TARGET];
if (!dev) throw new Error('unknown device ' + TARGET + ' (expected: ' + Object.keys(DEVICES).join(', ') + ')');

const PORT = process.env.SUNDER_PORT || '5173';
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = process.env.SUNDER_SHOT_DIR
  || path.join(__dirname, '..', 'store', 'screenshots', TARGET === 'iphone' ? 'iphone-6.9' : 'ipad-13');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  // SwiftShader flags: this runs headless on CI/containers with no real GPU.
  // On a machine with one, they are harmless -- but see the note about ?fx=full
  // above: software GL is exactly what makes the override necessary.
  // SUNDER_CHROMIUM is an escape hatch for environments where the repo's
  // playwright version and the installed browser build do not match.
  const b = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.SUNDER_CHROMIUM ? { executablePath: process.env.SUNDER_CHROMIUM } : {}),
  });
  const p = await b.newPage({
    viewport: { width: dev.w, height: dev.h },
    deviceScaleFactor: dev.dpr,
    isMobile: TARGET === 'iphone',
    hasTouch: true,
  });
  p.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 160)));
  await p.addInitScript(() => {
    try {
      localStorage.setItem('polyforge-tutorial-done', '1');
      localStorage.setItem('polyforge-tutorial-econ-done', '1');
    } catch {}
    // Pin Math.random. newGame() takes an explicit seed, but the AI does not --
    // runAiTurn rolls live, so the same seed produced a different mid-match on
    // every run (3 units then 5, hero alive then fallen, envoy then none) and
    // no camera framing could be tuned against a board that kept moving. A
    // plain LCG makes the whole capture reproducible, which is what a
    // screenshot set needs to be if it is ever regenerated.
    let seed = 0x5f3759df;
    Math.random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  });
  await p.goto(`${BASE}/?fx=full`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4500);

  // animations:'disabled' finishes CSS enter-animations instantly instead of
  // waiting for them to settle -- the modals all use animate-in fade-in, and at
  // the iPad's 2064x2752 on SwiftShader the default 30s stability timeout was
  // not enough for the briefing card. It also makes the frames repeatable.
  // (Babylon's own render loop is unaffected; this is CSS/Web Animations only.)
  const shot = async (name) => {
    await p.screenshot({
      path: path.join(OUT, `${TARGET}-${name}.png`),
      animations: 'disabled',
      timeout: 120000,
    });
    console.log('SHOT', `${TARGET}-${name}`);
  };
  const click = async (re, ms = 700) => {
    await p.getByRole('button', { name: re }).first().click().catch(() => {});
    await p.waitForTimeout(ms);
  };
  // The faction intro modal ("TO BATTLE") gates play. It appears after BEGIN
  // CONQUEST *and again after every newGame()* -- which is what broke the first
  // run: the reseed reopened it, endTurn was a no-op behind it, and all 14 turn
  // iterations sat out their full timeout on a game that had never started.
  const enterPlay = async (label) => {
    await p.getByRole('button', { name: /TO BATTLE/i }).first().click().catch(() => {});
    await p.getByRole('button', { name: /^End Turn$/i }).first()
      .waitFor({ timeout: 45000 })
      .catch(() => { throw new Error('never reached play state at: ' + label); });
    await p.waitForTimeout(2500);
  };

  await shot('01-menu');
  await click(/^Kharzul/i);
  await click(/^Continents/i); await click(/^normal$/i); await click(/11×11/);
  // 02 used to be the faction list again with a selection ring on Kharzul --
  // indistinguishable from 01 at thumbnail size, and a wasted store slot.
  // Scroll to the setup controls instead: map preset, difficulty, board size.
  await p.evaluate(() => {
    const el = [...document.querySelectorAll('*')]
      .find(e => /^difficulty$/i.test((e.textContent || '').trim()));
    (el || document.body).scrollIntoView({ block: 'center' });
  });
  await p.waitForTimeout(900);
  await shot('02-match-setup');
  await p.getByRole('button', { name: /BEGIN CONQUEST/i }).click().catch(() => {});
  await p.waitForTimeout(6000);
  // capture the intro card before dismissing it -- it is a strong identity
  // frame in its own right (passive, unique unit, opening tips)
  await shot('03-faction-briefing');
  await enterPlay('first boot');

  await p.evaluate(async () => {
    const st = await import('/src/game/core/state.ts');
    const ai = await import('/src/game/core/ai.ts');
    window.__g = st.game; window.__ai = ai.runAiTurn; window.__r = window.__sunder;
  });
  console.log('RESEED', JSON.stringify(await p.evaluate((seed) => {
    window.__g.newGame({ size: 11, humanTribe: 1, difficulty: 'normal', seed, preset: 'continents' });
    return { seed: window.__g.state.seed, phase: window.__g.state.phase };
  }, SEED)));
  await p.waitForTimeout(3000);
  await enterPlay('after reseed');

  // Play into a real mid-match. Errors are NOT swallowed here: a silent failure
  // produced a turn-0 board labelled "midmatch" on the first run.
  const playTurns = async (n) => {
    for (let t = 0; t < n; t++) {
      // A match can END inside the requested span -- Kharzul won on turn 10 on
      // one build. Stop here rather than letting the next endTurn no-op and
      // surface as "turn N did not advance", which pointed at the wrong thing.
      const phase = await p.evaluate(() => window.__g.state.phase);
      if (phase !== 'playing') {
        throw new Error(
          `match ended (phase=${phase}) after ${t} turns -- there is no mid-match ` +
          `board to capture and the autosave is cleared on gameover ` +
          `(state.ts:167). Re-run with SUNDER_TURNS below ${t}.`);
      }
      const before = await p.evaluate(() => window.__g.state.turn);
      // Play the human seat, then DRAIN the choices that gate endTurn.
      //
      // state.ts:621 -- `if (s.pendingCityReward != null) return;` -- makes
      // endTurn a silent no-op while a level-up choice is outstanding. When
      // runAiTurn plays the human tribe a city levels up, sets the flag, and
      // nothing ever clears it, because the auto-picker (aiPickCityReward) is
      // only wired for AI seats; a human is expected to answer the modal. The
      // turn then freezes at 0 with no error thrown -- which is exactly what we
      // measured, and why removing runAiTurn "fixed" the loop only by letting
      // the unattended tribe get wiped out by turn 10.
      await p.evaluate(() => {
        const g = window.__g;
        if (g.state.currentTribe === g.state.humanTribe) window.__ai(g, g.state.humanTribe);
        for (let i = 0; i < 12; i++) {
          const st = g.state;
          if (st.pendingCityReward != null) {
            const city = st.cities.find(c => c.id === st.pendingCityReward);
            if (!city) break;
            g.aiPickCityReward(city);
            continue;
          }
          if (st.pendingPerk) {
            const u = st.units.find(x => x.id === st.pendingPerk);
            const opts = u ? g.perkChoices(u) : null;
            if (!opts || !opts.length) break;
            g.choosePerk(opts[0]);
            continue;
          }
          break;
        }
        g.endTurn();
      });
      const ok = await p.waitForFunction(
        n0 => window.__g.state.turn > n0 && window.__g.state.currentTribe === window.__g.state.humanTribe,
        before, { timeout: 20000 },
      ).then(() => true).catch(() => false);
      if (!ok) {
        // Photograph whatever is blocking before giving up. A stall here is
        // almost always a modal waiting on the human seat (city level-up
        // reward, tech pick), not a renderer fault -- and the failure is
        // invisible without a frame.
        await p.screenshot({ path: path.join(OUT, `DEBUG-stall-turn${before}.png`) });
        const blockers = await p.evaluate(() =>
          [...document.querySelectorAll('button')].map(b => (b.innerText||'').trim())
            .filter(Boolean).slice(0, 25));
        console.log('STALL buttons on screen:', JSON.stringify(blockers));
        throw new Error(`turn ${t} did not advance past ${before}`);
      }
    }
  };
  await playTurns(TURNS);
  const st = await p.evaluate(() => {
    const s = window.__g.state;
    const mine = s.units.filter(u => u.tribe === s.humanTribe);
    return { turn: s.turn, myUnits: mine.length, types: [...new Set(mine.map(u => u.type))] };
  });
  console.log('STATE', JSON.stringify(st));
  // Guard against the original failure mode: a turn-0 board captured and
  // labelled "midmatch" because every endTurn had silently no-opped. Tied to
  // TURNS so that lowering it for a build where the match ends early does not
  // trip this instead.
  const floor = Math.min(10, TURNS);
  if (st.turn < floor) throw new Error(`game did not reach turn ${floor}: ` + JSON.stringify(st));
  await p.waitForTimeout(2500);

  // Event cards are worth a frame in their own right -- capture whatever is up
  // before we get rid of it.
  // Toasts stack four deep at the top of the frame by turn 14 and crowd the
  // card; clear them first so the kill card is the only thing on screen.
  const clearToasts = async () => {
    for (let i = 0; i < 10; i++) {
      const x = p.locator('button[aria-label="Dismiss"]').first();
      if (!(await x.isVisible().catch(() => false))) return;
      await x.click({ timeout: 3000 }).catch(() => {});
      await p.waitForTimeout(300);
    }
  };
  if (await p.getByRole('button', { name: /SHARE THIS KILL/i }).first().isVisible().catch(() => false)) {
    await clearToasts();
    await p.waitForTimeout(600);
    await shot('05-fatality-share');
  } else if (await p.getByRole('button', { name: /^Accept treaty$/i }).first().isVisible().catch(() => false)) {
    await clearToasts();
    await p.waitForTimeout(600);
    await shot('05-diplomacy-envoy');
  }

  // Getting a CLEAN board frame: reload, then CONTINUE from the autosave.
  //
  // Dismissing the event cards one by one does not terminate. Fourteen turns
  // queue up fatality cards, envoy treaties, "THE WORLD STIRS" toasts and
  // "YOUR COMMANDER HAS FALLEN"; the queue drains one card per click and
  // refills from events still pending, so clicking every non-HUD button for 20
  // rounds still ended on a modal (with different flavour text each run --
  // proof they were being generated, not re-clicked).
  //
  // The queue lives in the React tree, not in GameState. autoSave() (state.ts:
  // 159) writes the full state to localStorage on every change while phase is
  // "playing", and continueGame() (state.ts:259) rehydrates it. So a page
  // reload discards the modal queue and keeps the match. The loop above exits
  // with currentTribe === humanTribe, so the restored save is on the human's
  // turn and continueGame's mid-AI-round resume branch does not fire.
  await p.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(4500);
  const cont = p.getByRole('button', { name: /^CONTINUE\b/i }).first();
  await cont.waitFor({ timeout: 20000 })
    .catch(() => { throw new Error('no CONTINUE button after reload -- autosave missing'); });
  console.log('RESUME', (await cont.innerText()).replace(/\s+/g, ' ').trim());
  await cont.click();
  await p.getByRole('button', { name: /^End Turn$/i }).first()
    .waitFor({ timeout: 45000 })
    .catch(() => { throw new Error('continueGame did not reach play state'); });
  // the board rebuilds every slab, decor batch and unit from scratch here
  await p.waitForTimeout(6000);

  await p.evaluate(async () => {
    const st = await import('/src/game/core/state.ts');
    window.__g = st.game; window.__r = window.__sunder;
  });
  const resumed = await p.evaluate(() => {
    const s = window.__g.state;
    return { turn: s.turn, cur: s.currentTribe, human: s.humanTribe, phase: s.phase };
  });
  console.log('RESUMED', JSON.stringify(resumed));

  // Clearing the resume overlays. Two of the three are GAME STATE, not React
  // state, so they survive the save and come back with it -- clicking through
  // them is fragile because they stack (HeroFallenCard is z-55 over the recap's
  // z-30, so it silently ate the "To battle" click on the previous run). Each
  // has an explicit dismisser on the game object; call those instead:
  //   * s.heroFallen -> dismissHeroFallen()   (WorldEvents.tsx:69, "AVENGE THEM")
  //   * s.recap      -> dismissRecap()        (Hud.tsx:126, "While you were away")
  // The WorldEvents toasts are the only genuinely DOM-local ones; they carry
  // aria-label="Dismiss" and cannot refill, since their effect keys on
  // [s.turn, s.currentTribe, s.phase] and the turn no longer advances.
  console.log('DISMISS', JSON.stringify(await p.evaluate(() => {
    const g = window.__g;
    const had = {
      heroFallen: !!g.state.heroFallen,
      recap: (g.state.recap || []).length,
      incomingOffer: !!g.state.incomingOffer,
    };
    g.dismissHeroFallen?.();
    g.dismissRecap?.();
    // Diplomacy.tsx:108 -- an AI suing for peace. Also GameState-backed, so it
    // rides through the save; accept, which is both in character for a
    // mid-match board and the branch that leaves no follow-up card.
    if (g.state.incomingOffer) g.respondToOffer?.(true);
    return had;
  })));
  await p.waitForTimeout(600);
  for (let i = 0; i < 8; i++) {
    const x = p.locator('button[aria-label="Dismiss"]').first();
    if (!(await x.isVisible().catch(() => false))) break;
    await x.click({ timeout: 3000 }).catch(() => {});
    await p.waitForTimeout(350);
  }
  await p.waitForTimeout(800);

  // The HUD banners s.log[0] (state.ts:1490 pushes "<tribe> <unit> was promoted
  // to Veteran!"). On this seed the top line is an AI tribe's promotion, which
  // is a fine thing to see in play and a poor thing to put on a store page.
  // Drop the transient log so the banner does not render; nothing else reads it.
  // Framing. Targeting the CAPITAL was wrong: Talvi sits at (3,9) on an 11x11
  // board, two tiles from the south edge, so half the frame looked off the map
  // into void. Aim at the centroid of what the player actually holds.
  //
  // camera.target assignment rebuilds alpha/beta/radius from the camera
  // position (scene.ts:288 notes this), so beta and radius are set AFTER it.
  const framed = await p.evaluate(() => {
    const r = window.__sunder, s = window.__g.state, g = window.__g;
    s.log = [];
    const pts = [
      ...s.cities.filter(c => c.tribe === s.humanTribe),
      ...s.units.filter(u => u.tribe === s.humanTribe),
    ];
    if (!pts.length || !r) return null;
    const half = (s.size - 1) / 2;
    // Fit the BOUNDING BOX of the holdings, not their centroid at a fixed
    // radius: a fixed 8.5 framed a compact turn-14 board well and sliced the
    // flanking units off a spread-out one. Clamp the centre away from the map
    // edge too, so a capital near the rim does not aim half the frame at void.
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y);
    const lo = (v) => Math.min(...v), hi = (v) => Math.max(...v);
    const M = 2.5;
    const clamp = (v) => Math.min(s.size - 1 - M, Math.max(M, v));
    const cx = clamp((lo(xs) + hi(xs)) / 2);
    const cy = clamp((lo(ys) + hi(ys)) / 2);
    const span = Math.max(hi(xs) - lo(xs), hi(ys) - lo(ys), 3);
    const radius = Math.min(13, Math.max(8, span * 1.15 + 4));
    const cam = r.camera;
    cam.target = new (cam.target.constructor)(cx - half, 0, cy - half);
    // beta 0.85 from a 9-cell sweep scored on board-vs-sky coverage:
    //   1.15 -> 61-66% board   1.00 -> 65-71%   0.85 -> 69-77%
    // Tilt dominates, radius barely moves it. 0.85 is inside the game's own
    // upperBetaLimit (PI/2.6), so it is a framing a player can actually reach.
    cam.beta = 0.85;
    cam.radius = radius;
    g.emit?.({ type: "changed" });
    return { holdings: pts.length, cx: +cx.toFixed(2), cy: +cy.toFixed(2),
             span: +span.toFixed(1), radius: +radius.toFixed(2) };
  });
  console.log('FRAMED', JSON.stringify(framed));
  if (!framed) throw new Error('could not frame the board');
  await p.waitForTimeout(2000);

  const stray = await p.$$eval('button', bs => bs
    .filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map(b => (b.innerText || b.getAttribute('aria-label') || '').trim()).filter(Boolean).slice(0, 30));
  console.log('ON SCREEN', JSON.stringify(stray));
  // Above the sm breakpoint (iPad) the HUD shows its text labels, so the same
  // controls are named "Research"/"Planner"/"Next 3" there and are icon-only,
  // title-named, on the phone. Allow both spellings; \s covers "Next\n3".
  const HUD_OK = /^(End Turn|Map|Mute sound|Unmute sound|Research|Diplomacy|Planner|Undo|Next[\s\d]*|\d+)$/i;
  const left = stray.filter(l => !HUD_OK.test(l));
  if (left.length) throw new Error('overlay still covering the board: ' + JSON.stringify(left));
  await shot('04-board-midmatch');

  // panels reachable from the HUD, for gameplay-depth frames
  // The HUD collapses these labels to icons below sm (Hud.tsx:352-364), so each
  // button's accessible name falls back to its title=. Research's title is
  // "Research"; the planner's is the whole tooltip, which is why /^Planner$/
  // matched nothing and 07 was skipped on every earlier run.
  //
  // Closing the Research panel needs the backdrop, not the X: that button wraps
  // a bare icon with no text and no aria-label (Hud.tsx:690), so it has no
  // accessible name to select by. Its parent div carries onClick={onClose}
  // (Hud.tsx:684) and the panel is max-w-md inside p-4 padding, so on a 440px
  // viewport a click at x=8 lands on the backdrop. Without this the panel
  // stayed open and the planner toggled behind it -- 06 and 07 came out as the
  // same frame.
  const closePanel = async () => {
    await p.mouse.click(8, 300);
    await p.waitForTimeout(900);
    return !(await p.getByRole('heading', { name: /^Research$/ }).first().isVisible().catch(() => false));
  };

  await p.getByRole('button', { name: /^Research$/i }).first().click();
  await p.waitForTimeout(2000);
  await shot('06-research');
  if (!(await closePanel())) throw new Error('Research panel would not close');

  // The planner is a board OVERLAY, not a modal -- it paints projected building
  // value on every buildable tile, so it needs the board framing intact.
  // Phone: icon-only, so the accessible name falls back to title= ("City
  // planner - overlay..."). iPad: the label renders, and visible text wins over
  // title, so the name is just "Planner". Match either.
  const PLANNER = /^(Planner|City planner)/i;
  await p.getByRole('button', { name: PLANNER }).first().click();
  await p.waitForTimeout(2200);
  await shot('07-planner');
  await p.getByRole('button', { name: PLANNER }).first().click();
  await p.waitForTimeout(900);

  await b.close();
  console.log('STORE SHOTS COMPLETE', TARGET);
})().catch(e => { console.log('FAILED', String(e).slice(0, 300)); process.exit(1); });
