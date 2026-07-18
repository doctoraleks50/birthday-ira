/** Happy Birthday — keep-alive muted audio so finale unmute always works */

function audioUrl() {
  // Resolve against the page URL (GitHub Pages subpath-safe)
  try {
    return new URL("assets/audio/happy-birthday.wav", window.location.href).href;
  } catch {
    return "assets/audio/happy-birthday.wav";
  }
}

export class BirthdayMusic {
  constructor() {
    this.audio = null;
    this.ctx = null;
    this.playing = false;
    this._armed = false; // muted loop already running after a gesture
    this._loopId = null;
  }

  _ensureAudio() {
    if (this.audio) return this.audio;
    const a = new Audio(audioUrl());
    a.loop = true;
    a.preload = "auto";
    a.playsInline = true;
    a.setAttribute("playsinline", "");
    a.volume = 0;
    a.muted = true;
    this.audio = a;
    return a;
  }

  /** Call from a user gesture — starts a silent looping track (keep-alive) */
  async unlock() {
    const a = this._ensureAudio();

    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.02);
    } catch { /* ignore */ }

    try {
      a.muted = true;
      a.volume = 0;
      if (a.paused) {
        a.currentTime = 0;
        await a.play();
      }
      this._armed = true;
    } catch (err) {
      console.warn("music arm failed", err);
      this._armed = false;
    }
  }

  /** Audible playback at finale */
  async start() {
    if (this.playing && this.audio && !this.audio.muted && this.audio.volume > 0) return;

    const a = this._ensureAudio();
    if (this.ctx?.state === "suspended") {
      try { await this.ctx.resume(); } catch { /* ignore */ }
    }

    try {
      a.muted = false;
      a.volume = 0.78;
      if (a.paused) {
        await a.play();
      }
      this.playing = true;
      this._armed = true;
      return;
    } catch (err) {
      console.warn("music play failed", err);
    }

    // WebAudio fallback (works if ctx was unlocked on a gesture)
    try {
      await this._fallbackSynth();
    } catch (e2) {
      console.warn("music fallback failed", e2);
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
      gain.gain.linearRampToValueAtTime(0.32, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
      t += duration;
    }
    const loopMs = Math.max(1000, (t - this.ctx.currentTime) * 1000 + 900);
    this._loopId = setTimeout(() => {
      if (this.playing) this._fallbackSynth();
    }, loopMs);
  }

  stop() {
    this.playing = false;
    this._armed = false;
    if (this._loopId) clearTimeout(this._loopId);
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.muted = true;
        this.audio.volume = 0;
      } catch { /* ignore */ }
    }
  }
}
