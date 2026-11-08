import { prefs } from '../util/storage.js';

// All sounds are synthesised with WebAudio, so there are no audio files to load.
// The context starts on the first user gesture (browsers block autoplay).
export const sound = {
  ctx: null, out: null, muted: prefs.muted, eng: null, engGain: null, engFilter: null,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; this.ctx = new C();
      this.out = this.ctx.createGain(); this.out.gain.value = this.muted ? 0 : .5; this.out.connect(this.ctx.destination);
      // Engine drone: sawtooth through a low-pass filter, pitch follows speed
      this.eng = this.ctx.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 50;
      this.engFilter = this.ctx.createBiquadFilter(); this.engFilter.type = 'lowpass'; this.engFilter.frequency.value = 300;
      this.engGain = this.ctx.createGain(); this.engGain.gain.value = 0;
      this.eng.connect(this.engFilter).connect(this.engGain).connect(this.out); this.eng.start();
    } catch (e) { this.ctx = null; }
  },
  engineOn(on) { if (this.engGain) this.engGain.gain.setTargetAtTime(on ? .06 : 0, this.ctx.currentTime, .08); },
  engineSet(v, thr) {
    if (!this.eng) return;
    const t = this.ctx.currentTime;
    this.eng.frequency.setTargetAtTime(45 + v * 3.2, t, .05);
    this.engFilter.frequency.setTargetAtTime(220 + v * 28 + thr * 300, t, .05);
  },

  tone(type, f0, f1, dur, vol) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + .02);
  },
  noise(dur, vol, f0, f1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = this.ctx.createBufferSource(), fl = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(fl).connect(g).connect(this.out); s.start(t);
  },

  jump() { this.tone('square', 220, 520, .16, .12); },
  pad() { this.tone('square', 180, 900, .35, .14); },
  land() { this.noise(.12, .25, 900, 120); },
  bump() { this.tone('triangle', 140, 60, .15, .3); },
  boost() { this.noise(.5, .3, 600, 4000); this.tone('sawtooth', 200, 600, .4, .06); },
  fuel() { [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone('sine', f, f, .12, .15), i * 60)); },
  boom() { this.noise(1.2, .7, 2500, 60); this.tone('sawtooth', 120, 30, .8, .2); },
  win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone('triangle', f, f, .25, .18), i * 110)); },
  firework() { this.tone('triangle', 500 + Math.random() * 500, 200, .3, .06); },

  /** Flips mute, remembers it, and returns the new state. */
  toggleMute() {
    this.muted = !this.muted; prefs.muted = this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : .5;
    return this.muted;
  },
};
