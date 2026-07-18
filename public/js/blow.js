/**
 * Detect microphone BLOW (air noise), not speech.
 * Blow ≈ broadband mid/high noise with high spectral flatness.
 * Voice ≈ harmonic peaks / formants in lower bands.
 */
export class BlowDetector {
  constructor() {
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this._data = null;
    this._time = null;
    this.active = false;
    this._baseline = 0.02;
    this._calibrated = false;
    this._calibSamples = [];
  }

  async start() {
    if (this.active) return true;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    });
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") await this.ctx.resume();

    const source = this.ctx.createMediaStreamSource(this.stream);
    // High-pass ~800Hz — blow energy lives above typical voice fundamentals
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    hp.Q.value = 0.7;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.55;

    source.connect(hp);
    hp.connect(this.analyser);

    this._data = new Uint8Array(this.analyser.frequencyBinCount);
    this._time = new Float32Array(this.analyser.fftSize);
    this.active = true;
    this._calibrated = false;
    this._calibSamples = [];
    return true;
  }

  stop() {
    this.active = false;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
  }

  /**
   * @returns {{ intensity: number, isBlow: boolean }}
   * intensity 0..1 — how hard the blow is
   */
  sample() {
    if (!this.active || !this.analyser) return { intensity: 0, isBlow: false };

    this.analyser.getByteFrequencyData(this._data);
    this.analyser.getFloatTimeDomainData(this._time);

    // RMS of time domain (post high-pass)
    let sum = 0;
    for (let i = 0; i < this._time.length; i++) sum += this._time[i] * this._time[i];
    const rms = Math.sqrt(sum / this._time.length);

    // Frequency bands (after analyser — still full spectrum of signal after HP filter path)
    const binHz = this.ctx.sampleRate / this.analyser.fftSize;
    let low = 0, mid = 0, high = 0, lowN = 0, midN = 0, highN = 0;
    let flatNum = 0, flatDen = 0;
    for (let i = 1; i < this._data.length; i++) {
      const hz = i * binHz;
      const v = this._data[i] / 255;
      if (hz < 500) { low += v; lowN++; }
      else if (hz < 3500) { mid += v; midN++; }
      else if (hz < 9000) { high += v; highN++; }
      // spectral flatness helpers on mid-high
      if (hz >= 1000 && hz < 8000 && v > 0.01) {
        flatNum += Math.log(v + 1e-6);
        flatDen += v;
      }
    }
    const lowAvg = lowN ? low / lowN : 0;
    const midAvg = midN ? mid / midN : 0;
    const highAvg = highN ? high / highN : 0;

    // Calibrate ambient for ~0.8s
    if (!this._calibrated) {
      this._calibSamples.push(rms);
      if (this._calibSamples.length > 25) {
        this._baseline = this._calibSamples.reduce((a, b) => a + b, 0) / this._calibSamples.length;
        this._calibrated = true;
      }
      return { intensity: 0, isBlow: false };
    }

    const excess = Math.max(0, rms - this._baseline * 1.8);
    // Blow signature: energy in mid+high, not dominated by low (voice)
    const hiRatio = (midAvg + highAvg) / (lowAvg + midAvg + highAvg + 1e-4);
    const isBlow = excess > 0.012 && hiRatio > 0.45 && midAvg > 0.04;

    // Map to intensity
    let intensity = 0;
    if (isBlow) {
      intensity = Math.min(1, (excess - 0.012) / 0.08);
      // reward strong broadband mid energy
      intensity *= 0.6 + 0.4 * Math.min(1, midAvg / 0.25);
    }

    return { intensity, isBlow };
  }
}
