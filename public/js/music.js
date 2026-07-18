/** Happy Birthday — HTMLAudioElement + AudioContext unlock (mobile-safe) */

export class BirthdayMusic {
  constructor() {
    this.audio = null;
    this.ctx = null;
    this.playing = false;
    this._unlocked = false;
  }

  _ensureAudio() {
    if (this.audio) return this.audio;
    const a = new Audio("assets/audio/happy-birthday.wav");
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.72;
    this.audio = a;
    return a;
  }

  /** Call from a user gesture so later start() is allowed */
  async unlock() {
    this._ensureAudio();
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    // Silent blip unlocks WebAudio on iOS
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.02);
    } catch { /* ignore */ }

    // Prime HTMLAudio on the same gesture (critical for iOS/Safari)
    const a = this.audio;
    try {
      a.muted = true;
      a.currentTime = 0;
      await a.play();
      a.pause();
      a.muted = false;
      a.currentTime = 0;
    } catch { /* ignore — may still work after later gesture */ }

    this._unlocked = true;
  }

  async start() {
    if (this.playing) return;
    const a = this._ensureAudio();
    if (this.ctx?.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    try {
      a.muted = false;
      a.volume = 0.72;
      a.currentTime = 0;
      await a.play();
      this.playing = true;
    } catch (err) {
      console.warn("music play failed", err);
      // Fallback: synthesize once via WebAudio if file blocked
      try {
        await this._fallbackSynth();
      } catch (e2) {
        console.warn("music fallback failed", e2);
      }
    }
  }

  async _fallbackSynth() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.playing = true;
    const MELODY = [
      ["C4", 0.35], ["C4", 0.15], ["D4", 0.5], ["C4", 0.5], ["F4", 0.5], ["E4", 0.75],
      ["C4", 0.35], ["C4", 0.15], ["D4", 0.5], ["C4", 0.5], ["G4", 0.5], ["F4", 0.75],
      ["C4", 0.35], ["C4", 0.15], ["C5", 0.5], ["A4", 0.5], ["F4", 0.5], ["E4", 0.5], ["D4", 0.75],
      ["Ab4", 0.35], ["Ab4", 0.15], ["A4", 0.5], ["F4", 0.5], ["G4", 0.5], ["F4", 1.0],
    ];
    const FREQ = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, Ab4: 415.3, C5: 523.25 };
    const beat = 0.42;
    let t = this.ctx.currentTime + 0.05;
    for (const [note, dur] of MELODY) {
      const duration = dur * beat;
      const freq = FREQ[note];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
      t += duration;
    }
    // loop fallback every ~7s
    const loopMs = (t - this.ctx.currentTime) * 1000 + 1200;
    this._loopId = setTimeout(() => {
      if (this.playing) this._fallbackSynth();
    }, loopMs);
  }

  stop() {
    this.playing = false;
    if (this._loopId) clearTimeout(this._loopId);
    if (this.audio) {
      try { this.audio.pause(); this.audio.currentTime = 0; } catch { /* ignore */ }
    }
  }
}
