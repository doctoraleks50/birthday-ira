/** Web Audio — мелодія Happy Birthday + lyrics «dear Ira» */

const MELODY = [
  { note: "C4", dur: 0.35 },
  { note: "C4", dur: 0.15 },
  { note: "D4", dur: 0.5 },
  { note: "C4", dur: 0.5 },
  { note: "F4", dur: 0.5 },
  { note: "E4", dur: 0.75 },
  { note: "C4", dur: 0.35 },
  { note: "C4", dur: 0.15 },
  { note: "D4", dur: 0.5 },
  { note: "C4", dur: 0.5 },
  { note: "G4", dur: 0.5 },
  { note: "F4", dur: 0.75 },
  { note: "C4", dur: 0.35 },
  { note: "C4", dur: 0.15 },
  { note: "C5", dur: 0.5 },
  { note: "A4", dur: 0.5 },
  { note: "F4", dur: 0.5 },
  { note: "E4", dur: 0.5 },
  { note: "D4", dur: 0.75 },
  { note: "Ab4", dur: 0.35 },
  { note: "Ab4", dur: 0.15 },
  { note: "A4", dur: 0.5 },
  { note: "F4", dur: 0.5 },
  { note: "G4", dur: 0.5 },
  { note: "F4", dur: 1.0 },
];

const LYRICS = [
  "Happy birthday to you",
  "Happy birthday to you",
  "Happy birthday, dear Ira",
  "Happy birthday to you",
];

const FREQ = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23,
  G4: 392.0, A4: 440.0, Ab4: 415.3, C5: 523.25,
};

export class BirthdayMusic {
  constructor(onLyric) {
    this.onLyric = onLyric;
    this.ctx = null;
    this.playing = false;
    this._timeouts = [];
    this._lineIndex = 0;
  }

  async start() {
    if (this.playing) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.playing = true;
    this._lineIndex = 0;
    this._playMelody(this.ctx.currentTime + 0.1);
  }

  _playMelody(startTime) {
    let t = startTime;
    const beat = 0.42;
    let noteIdx = 0;

    for (const { note, dur } of MELODY) {
      const when = t;
      const duration = dur * beat;
      this._playNote(note, duration, when);
      t += duration;
      noteIdx++;

      // Lyrics on phrase boundaries
      if (noteIdx === 6 || noteIdx === 12 || noteIdx === 18 || noteIdx === 24) {
        const line = LYRICS[this._lineIndex++];
        this._timeouts.push(
          setTimeout(() => this.onLyric?.(line), (when - this.ctx.currentTime) * 1000)
        );
      }
    }

    // Loop after pause
    const totalDur = (t - startTime) * 1000 + 2000;
    this._timeouts.push(
      setTimeout(() => {
        if (this.playing) {
          this._lineIndex = 0;
          this._playMelody(this.ctx.currentTime + 1.5);
        }
      }, totalDur)
    );
  }

  _playNote(noteName, duration, when) {
    if (!this.ctx || !this.playing) return;
    const freq = FREQ[noteName];
    const now = when;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.05);

    // Soft harmony
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(freq * 0.5, now);
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now);
    osc2.stop(now + duration + 0.05);
  }

  stop() {
    this.playing = false;
    for (const id of this._timeouts) clearTimeout(id);
    this._timeouts = [];
    this.ctx?.close();
    this.ctx = null;
  }
}
