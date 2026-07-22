// Polyforge — Isoglow. Sound engine: synthesized WebAudio SFX + ambient menu music.
// All SFX are procedurally synthesized (no asset downloads); music is a generated
// ambient loop streamed from storage. Mute state persists in localStorage.

const MUTE_KEY = "polyforge-muted";
const MUSIC_URL = "/manus-storage/menu-theme_ab3abdad.mp3";

type SfxName =
  | "click"
  | "attack"
  | "catapult"
  | "capture"
  | "plunder"
  | "heal"
  | "ruin"
  | "turn"
  | "promote"
  | "victory"
  | "defeat";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: HTMLAudioElement | null = null;
  private musicTarget = 0; // 0..1 desired music volume
  muted: boolean;
  private listeners = new Set<() => void>();

  constructor() {
    let m = false;
    try { m = localStorage.getItem(MUTE_KEY) === "1"; } catch { /* noop */ }
    this.muted = m;
  }

  onChange(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  /** lazily create the AudioContext (must follow a user gesture) */
  private ensureCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  setMuted(m: boolean) {
    this.muted = m;
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch { /* noop */ }
    this.applyMusicVolume();
    this.listeners.forEach((fn) => fn());
  }
  toggleMuted() { this.setMuted(!this.muted); }

  // ---------- music ----------
  /** fade the menu theme in (menu) or out (in-game) */
  playMenuMusic() {
    if (!this.music) {
      this.music = new Audio(MUSIC_URL);
      this.music.loop = true;
      this.music.volume = 0;
    }
    this.musicTarget = 0.35;
    this.applyMusicVolume();
    void this.music.play().catch(() => {
      /* autoplay blocked — will start on first user gesture via kick() */
    });
  }
  stopMenuMusic() {
    this.musicTarget = 0;
    this.applyMusicVolume();
  }
  /** call on any user gesture to satisfy autoplay policies */
  kick() {
    this.ensureCtx();
    if (this.music && this.musicTarget > 0 && this.music.paused && !this.muted) {
      void this.music.play().catch(() => { /* still blocked */ });
    }
  }
  private fadeTimer: number | null = null;
  private applyMusicVolume() {
    if (!this.music) return;
    const target = this.muted ? 0 : this.musicTarget;
    if (this.fadeTimer !== null) window.clearInterval(this.fadeTimer);
    this.fadeTimer = window.setInterval(() => {
      if (!this.music) return;
      const v = this.music.volume;
      const next = v + (target - v) * 0.18;
      this.music.volume = Math.abs(next - target) < 0.01 ? target : next;
      if (this.music.volume === target) {
        if (this.fadeTimer !== null) window.clearInterval(this.fadeTimer);
        this.fadeTimer = null;
        if (target === 0) this.music.pause();
      }
    }, 50);
    if (target > 0 && this.music.paused) void this.music.play().catch(() => { /* gesture needed */ });
  }

  // ---------- synth helpers ----------
  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slideTo?: number; decay?: boolean } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const { type = "sine", vol = 0.2, at = 0, slideTo, decay = true } = opts;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(slideTo, 1), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    if (decay) g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    else g.gain.setValueAtTime(vol, t0 + dur - 0.02), g.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { vol?: number; at?: number; lowpass?: number } = {}) {
    const ctx = this.ensureCtx();
    if (!ctx || !this.master) return;
    const { vol = 0.25, at = 0, lowpass = 1200 } = opts;
    const t0 = ctx.currentTime + at;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t0);
  }

  // ---------- public SFX ----------
  play(name: SfxName) {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    switch (name) {
      case "click":
        this.tone(660, 0.07, { type: "triangle", vol: 0.12 });
        break;
      case "attack": // dull thud + metallic ring
        this.noise(0.16, { vol: 0.35, lowpass: 700 });
        this.tone(180, 0.18, { type: "square", vol: 0.14, slideTo: 70 });
        this.tone(1100, 0.1, { type: "triangle", vol: 0.06, at: 0.02 });
        break;
      case "catapult": // creak + whoosh up
        this.tone(90, 0.25, { type: "sawtooth", vol: 0.1, slideTo: 55 });
        this.tone(300, 0.4, { type: "sine", vol: 0.12, at: 0.12, slideTo: 900 });
        this.noise(0.3, { vol: 0.12, at: 0.1, lowpass: 2400 });
        break;
      case "capture": // little rising fanfare
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, { type: "triangle", vol: 0.16, at: i * 0.09 }));
        break;
      case "plunder": // two coin chimes
        this.tone(1319, 0.12, { type: "sine", vol: 0.16 });
        this.tone(1760, 0.14, { type: "sine", vol: 0.14, at: 0.08 });
        this.tone(2637, 0.1, { type: "sine", vol: 0.08, at: 0.16 });
        break;
      case "heal": // soft shimmer arpeggio
        [880, 1109, 1319, 1760].forEach((f, i) => this.tone(f, 0.22, { type: "sine", vol: 0.07, at: i * 0.055 }));
        break;
      case "ruin": // mysterious low bloom
        this.tone(220, 0.5, { type: "sine", vol: 0.14, slideTo: 330 });
        this.tone(440, 0.45, { type: "triangle", vol: 0.08, at: 0.15 });
        this.tone(1109, 0.3, { type: "sine", vol: 0.06, at: 0.3 });
        break;
      case "turn": // gentle two-note ping
        this.tone(523, 0.1, { type: "triangle", vol: 0.1 });
        this.tone(784, 0.14, { type: "triangle", vol: 0.1, at: 0.09 });
        break;
      case "promote": // heroic third
        this.tone(587, 0.15, { type: "triangle", vol: 0.14 });
        this.tone(740, 0.15, { type: "triangle", vol: 0.14, at: 0.1 });
        this.tone(880, 0.25, { type: "triangle", vol: 0.16, at: 0.2 });
        break;
      case "victory":
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.3, { type: "triangle", vol: 0.16, at: i * 0.12 }));
        break;
      case "defeat":
        [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.4, { type: "sine", vol: 0.15, at: i * 0.18 }));
        break;
    }
  }
}

export const sound = new SoundEngine();
