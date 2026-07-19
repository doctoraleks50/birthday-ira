/** Happy Birthday — WebAudio keep-alive so finale unmute works without a fresh gesture */

function audioUrl() {
  try {
    return new URL("assets/audio/happy-birthday.wav", window.location.href).href;
  } catch {
    return "assets/audio/happy-birthday.wav";
  }
}

export class BirthdayMusic {
  constructor() {
    this.ctx = null;
    this.buffer = null;
    this.source = null;
    this.gain = null;
    this.playing = false;
    this._armed = false;
    this._loading = null;
    this._loopId = null;
    this.audio = null; // HTMLAudio fallback
  }

  _ensureCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return this.ctx;
  }

  async _resumeCtx() {
    const ctx = this._ensureCtx();
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        /* ignore */
      }
    }
    return ctx;
  }

  async _loadBuffer() {
    if (this.buffer) return this.buffer;
    if (this._loading) return this._loading;
    this._loading = (async () => {
      const res = await fetch(audioUrl());
      const raw = await res.arrayBuffer();
      const ctx = this._ensureCtx();
      this.buffer = await ctx.decodeAudioData(raw.slice(0));
      return this.buffer;
    })().catch((err) => {
      console.warn("music decode failed", err);
      this._loading = null;
      return null;
    });
    return this._loading;
  }

  _startSilentLoop() {
    if (!this.buffer || !this.ctx) return false;
    try {
      if (this.source) {
        try {
          this.source.stop();
        } catch {
          /* ignore */
        }
        this.source.disconnect();
        this.source = null;
      }
      if (!this.gain) {
        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
      }
      this.gain.gain.value = 0.0001;
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer;
      src.loop = true;
      src.connect(this.gain);
      src.start(0);
      this.source = src;
      this._armed = true;
      return true;
    } catch (err) {
      console.warn("music silent loop failed", err);
      return false;
    }
  }

  /** Call from a user gesture — arms silent looping track */
  async unlock() {
    const ctx = await this._resumeCtx();

    // Tiny beep unlocks AudioContext on stubborn mobile browsers
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.02);
    } catch {
      /* ignore */
    }

    const buf = await this._loadBuffer();
    if (buf) {
      if (!this.source || !this._armed) {
        this._startSilentLoop();
      } else if (ctx.state === "running" && this.gain) {
        this._armed = true;
      }
    }

    // Also arm HTMLAudio as backup
    try {
      if (!this.audio) {
        const a = new Audio(audioUrl());
        a.loop = true;
        a.preload = "auto";
        a.playsInline = true;
        a.setAttribute("playsinline", "");
        a.muted = true;
        a.volume = 0;
        this.audio = a;
      }
      const a = this.audio;
      a.muted = true;
      a.volume = 0;
      if (a.paused) {
        a.currentTime = 0;
        await a.play();
      }
      this._armed = true;
    } catch (err) {
      console.warn("music html arm failed", err);
    }
  }

  /** Audible playback at finale (may run outside a gesture) */
  async start() {
    if (this.playing && this.gain && this.gain.gain.value > 0.1) return;

    await this._resumeCtx();
    const buf = await this._loadBuffer();

    if (buf) {
      if (!this.source || !this._armed) {
        this._startSilentLoop();
      }
      if (this.gain && this.source) {
        const t = this.ctx.currentTime;
        try {
          this.gain.gain.cancelScheduledValues(t);
          this.gain.gain.setValueAtTime(Math.max(0.0001, this.gain.gain.value), t);
          this.gain.gain.linearRampToValueAtTime(0.72, t + 0.35);
        } catch {
          this.gain.gain.value = 0.72;
        }
        this.playing = true;
        this._armed = true;
        return;
      }
    }

    // HTMLAudio unmute fallback
    try {
      if (!this.audio) {
        const a = new Audio(audioUrl());
        a.loop = true;
        a.playsInline = true;
        a.setAttribute("playsinline", "");
        this.audio = a;
      }
      const a = this.audio;
      a.muted = false;
      a.volume = 0.78;
      if (a.paused) await a.play();
      this.playing = true;
      return;
    } catch (err) {
      console.warn("music html play failed", err);
    }

    try {
      await this._fallbackSynth();
    } catch (e2) {
      console.warn("music fallback failed", e2);
    }
  }

  async _fallbackSynth() {
    const ctx = await this._resumeCtx();
    this.playing = true;

    const MELODY = [
      ["C4", 0.35], ["C4", 0.15], ["D4", 0.5], ["C4", 0.5], ["F4", 0.5], ["E4", 0.75],
      ["C4", 0.35], ["C4", 0.15], ["D4", 0.5], ["C4", 0.5], ["G4", 0.5], ["F4", 0.75],
      ["C4", 0.35], ["C4", 0.15], ["C5", 0.5], ["A4", 0.5], ["F4", 0.5], ["E4", 0.5], ["D4", 0.75],
      ["Ab4", 0.35], ["Ab4", 0.15], ["A4", 0.5], ["F4", 0.5], ["G4", 0.5], ["F4", 1.0],
    ];
    const FREQ = {
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
      G4: 392, A4: 440, Ab4: 415.3, C5: 523.25,
    };
    const beat = 0.42;
    let t = ctx.currentTime + 0.05;
    for (const [note, dur] of MELODY) {
      const duration = dur * beat;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(FREQ[note], t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
      t += duration;
    }
    const loopMs = Math.max(1000, (t - ctx.currentTime) * 1000 + 900);
    this._loopId = setTimeout(() => {
      if (this.playing) this._fallbackSynth();
    }, loopMs);
  }

  stop() {
    this.playing = false;
    this._armed = false;
    if (this._loopId) clearTimeout(this._loopId);
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* ignore */
      }
      try {
        this.source.disconnect();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    if (this.gain) {
      try {
        this.gain.gain.value = 0;
      } catch {
        /* ignore */
      }
    }
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.muted = true;
        this.audio.volume = 0;
      } catch {
        /* ignore */
      }
    }
  }
}
