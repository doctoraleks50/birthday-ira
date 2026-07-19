/**
 * Happy Birthday music.
 * Never use audio.muted=true for keep-alive — on iOS unmute often stays silent.
 * Arm with unmuted + near-zero volume on gestures; raise volume at finale.
 */

function audioUrl(name = "happy-birthday.wav") {
  try {
    return new URL(`assets/audio/${name}`, window.location.href).href;
  } catch {
    return `assets/audio/${name}`;
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
    this._loopId = null;
    this._keepAlive = null;
  }

  _ensureAudio() {
    if (this.audio) return this.audio;
    const a = new Audio();
    a.preload = "auto";
    a.loop = true;
    a.playsInline = true;
    a.setAttribute("playsinline", "");
    a.setAttribute("webkit-playsinline", "");
    a.crossOrigin = "anonymous";
    // CRITICAL: do not use muted=true
    a.muted = false;
    a.volume = 0.001;
    a.src = audioUrl();
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

  _ensureGain() {
    if (!this.ctx) return null;
    if (!this.gain) {
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.001;
      this.gain.connect(this.ctx.destination);
    }
    return this.gain;
  }

  _startWebLoop(volume = 0.001) {
    if (!this.buffer || !this.ctx) return false;
    try {
      if (this.source) {
        try {
          this.source.onended = null;
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
      const g = this._ensureGain();
      g.gain.value = volume;
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer;
      src.loop = true;
      src.connect(g);
      src.start(0);
      this.source = src;
      return true;
    } catch (err) {
      console.warn("music webaudio loop", err);
      return false;
    }
  }

  _watchHtml() {
    if (this._keepAlive) return;
    this._keepAlive = setInterval(() => {
      if (!this._armed || !this.audio) return;
      // If browser paused the quiet loop, nudge it back
      if (this.audio.paused) {
        this.audio.play().catch(() => {});
      }
    }, 2000);
  }

  /** Call from user gestures */
  async unlock() {
    const a = this._ensureAudio();
    a.muted = false;
    if (a.volume < 0.001) a.volume = 0.001;

    await this._resumeCtx();
    try {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      g.gain.value = 0.00001;
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.01);
    } catch {
      /* ignore */
    }

    try {
      if (a.paused) {
        await a.play();
      }
      this._armed = true;
      this._watchHtml();
    } catch (err) {
      console.warn("music html unlock", err);
    }

    const buf = await this._loadBuffer();
    if (buf && !this.source) {
      this._startWebLoop(0.001);
    }
  }

  /** Audible playback at finale */
  async start() {
    await this.unlock();

    const a = this._ensureAudio();
    a.muted = false;
    a.volume = 1.0;

    let htmlOk = false;
    try {
      if (a.paused) {
        a.currentTime = 0;
        await a.play();
      }
      htmlOk = !a.paused;
      this.playing = htmlOk;
    } catch (err) {
      console.warn("music html start", err);
    }

    // WebAudio path (often works even with iOS silent switch)
    await this._resumeCtx();
    const buf = await this._loadBuffer();
    if (buf) {
      if (!this.source) this._startWebLoop(0.001);
      if (this.gain && this.source && this.ctx.state === "running") {
        const t = this.ctx.currentTime;
        try {
          this.gain.gain.cancelScheduledValues(t);
          this.gain.gain.setValueAtTime(Math.max(0.001, this.gain.gain.value), t);
          this.gain.gain.linearRampToValueAtTime(1.0, t + 0.2);
        } catch {
          this.gain.gain.value = 1.0;
        }
        this.playing = true;
      } else if (buf) {
        this._startWebLoop(1.0);
        this.playing = true;
      }
    }

    if (!htmlOk && !this.playing) {
      try {
        await this._fallbackSynth();
      } catch (e2) {
        console.warn("music synth", e2);
      }
    }

    return this.playing || htmlOk || !a.paused;
  }

  /** True if something is actually outputting */
  isAudible() {
    const html =
      this.audio &&
      !this.audio.paused &&
      !this.audio.muted &&
      this.audio.volume > 0.05;
    const web =
      this.gain &&
      this.source &&
      this.ctx?.state === "running" &&
      this.gain.gain.value > 0.05;
    return !!(html || web || this.playing);
  }

  async _fallbackSynth() {
    const ctx = await this._resumeCtx();
    if (ctx.state !== "running") return;
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
      osc.type = "triangle";
      osc.frequency.setValueAtTime(FREQ[note], t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.55, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration + 0.05);
      t += duration;
    }
    const loopMs = Math.max(1000, (t - ctx.currentTime) * 1000 + 800);
    this._loopId = setTimeout(() => {
      if (this.playing) this._fallbackSynth();
    }, loopMs);
  }

  stop() {
    this.playing = false;
    this._armed = false;
    if (this._loopId) clearTimeout(this._loopId);
    if (this._keepAlive) {
      clearInterval(this._keepAlive);
      this._keepAlive = null;
    }
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* ignore */
      }
      this.source = null;
    }
    if (this.gain) this.gain.gain.value = 0;
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.volume = 0.001;
        this.audio.muted = false;
      } catch {
        /* ignore */
      }
    }
  }
}
