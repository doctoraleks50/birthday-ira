/**
 * Happy Birthday — silent until finale.
 * unlock() only resumes AudioContext + preloads; never starts the track.
 * start() plays the real WAV only after candles are out.
 */

function audioUrl() {
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
    this.buffer = null;
    this.source = null;
    this.gain = null;
    this.playing = false;
    this._armed = false;
    this._loading = null;
  }

  _ensureAudio() {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = "auto";
    a.loop = true;
    a.playsInline = true;
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    a.muted = false;
    a.volume = 1;
    a.src = audioUrl();
    // Preload only — do not play here
    try {
      a.load();
    } catch {
      /* ignore */
    }
    this.audio = a;
    return a;
  }

  async _resumeCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
    return this.ctx;
  }

  async _loadBuffer() {
    if (this.buffer) return this.buffer;
    if (this._loading) return this._loading;
    this._loading = (async () => {
      const ctx = await this._resumeCtx();
      const res = await fetch(audioUrl());
      const raw = await res.arrayBuffer();
      this.buffer = await ctx.decodeAudioData(raw.slice(0));
      return this.buffer;
    })().catch((err) => {
      console.warn("music decode", err);
      this._loading = null;
      return null;
    });
    return this._loading;
  }

  /**
   * Gesture-only prep: unlock AudioContext + preload WAV.
   * Must NOT start audible playback.
   */
  async unlock() {
    this._ensureAudio();
    const ctx = await this._resumeCtx();

    // Silent tick so the context stays running after the gesture
    try {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.01);
    } catch {
      /* ignore */
    }

    await this._loadBuffer();
    this._armed = ctx.state === "running";
  }

  _startWebAudio() {
    if (!this.buffer || !this.ctx) return false;
    try {
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
      if (!this.gain) {
        this.gain = this.ctx.createGain();
        this.gain.connect(this.ctx.destination);
      }
      this.gain.gain.value = 0;
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer;
      src.loop = true;
      src.connect(this.gain);
      src.start(0);
      const t = this.ctx.currentTime;
      this.gain.gain.setValueAtTime(0, t);
      this.gain.gain.linearRampToValueAtTime(0.95, t + 0.4);
      this.source = src;
      return true;
    } catch (err) {
      console.warn("music webaudio", err);
      return false;
    }
  }

  /** Start audible Happy Birthday — only after candles are blown */
  async start() {
    if (this.playing) return true;

    await this._resumeCtx();
    await this._loadBuffer();

    let ok = false;

    // Prefer WebAudio (works after earlier unlock without a fresh gesture)
    if (this.buffer && this.ctx?.state === "running") {
      ok = this._startWebAudio();
    }

    // HTMLAudio backup
    try {
      const a = this._ensureAudio();
      a.muted = false;
      a.volume = 1;
      a.currentTime = 0;
      await a.play();
      ok = ok || !a.paused;
    } catch (err) {
      console.warn("music html", err);
    }

    this.playing = ok;
    return ok;
  }

  isAudible() {
    const html =
      this.audio && !this.audio.paused && !this.audio.muted && this.audio.volume > 0.2;
    const web =
      this.source &&
      this.gain &&
      this.ctx?.state === "running" &&
      this.gain.gain.value > 0.2;
    return !!(this.playing || html || web);
  }

  stop() {
    this.playing = false;
    this._armed = false;
    if (this.source) {
      try {
        this.source.stop();
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
      } catch {
        /* ignore */
      }
    }
  }
}
