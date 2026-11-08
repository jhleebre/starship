// Background music, synthesised and scheduled with WebAudio (no audio files).
// A driving 16-bar synthwave loop in A minor (Am–F–C–G | Am–F–G–E, played
// twice): an original melody, then a variation that runs higher.
// The band grows with the level: pulsing octave bass, sixteenth arpeggio, pad
// and lead from the start, hi-hat from level 3, kick and snare from level 5,
// a counter-bell from level 7, and the tempo rises a little every level.
// Goes through sound.out, so M (mute all) applies too; N turns just the music off.
import { sound } from './sound.js';
import { prefs } from '../util/storage.js';

const STEPS = 16;                   // sixteenth notes per bar
const midi = n => 440 * Math.pow(2, (n - 69) / 12);

// One chord per bar: bass root and chord tones (MIDI)
const AM = { bass: 45, tri: [69, 72, 76] };
const F = { bass: 41, tri: [69, 72, 77] };
const C = { bass: 48, tri: [67, 72, 76] };
const G = { bass: 43, tri: [67, 71, 74] };
const E = { bass: 40, tri: [68, 71, 76] }; // major V pulls back to Am
const HALF = [AM, F, C, G, AM, F, G, E];
const BARS = [...HALF, ...HALF];

// Lead melody per bar: [step, note, length in steps]
const MELODY = [
  // Theme: wide intervals over the road ahead
  [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 69, 6], [14, 72, 2]],
  [[0, 77, 6], [6, 76, 2], [8, 72, 4], [12, 69, 4]],
  [[0, 76, 4], [4, 79, 4], [8, 76, 2], [10, 74, 2], [12, 72, 4]],
  [[0, 74, 8], [8, 71, 4], [12, 67, 4]],
  [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 81, 6], [14, 79, 2]],
  [[0, 77, 4], [4, 76, 4], [8, 74, 4], [12, 72, 4]],
  [[0, 74, 4], [4, 71, 4], [8, 74, 2], [10, 76, 2], [12, 79, 4]],
  [[0, 80, 8], [8, 76, 4], [12, 71, 4]],
  // Variation: running notes an octave up, like hitting a boost
  [[0, 81, 2], [2, 79, 2], [4, 76, 2], [6, 79, 2], [8, 81, 4], [12, 84, 4]],
  [[0, 84, 2], [2, 81, 2], [4, 77, 2], [6, 81, 2], [8, 84, 6], [14, 86, 2]],
  [[0, 88, 6], [6, 86, 2], [8, 84, 4], [12, 79, 4]],
  [[0, 86, 4], [4, 83, 4], [8, 79, 4], [12, 74, 4]],
  [[0, 81, 2], [2, 84, 2], [4, 88, 4], [8, 86, 2], [10, 84, 2], [12, 81, 4]],
  [[0, 84, 4], [4, 81, 4], [8, 77, 2], [10, 79, 2], [12, 81, 4]],
  [[0, 79, 2], [2, 81, 2], [4, 83, 4], [8, 86, 4], [12, 83, 4]],
  [[0, 80, 6], [6, 83, 2], [8, 88, 8]],
];
// Arpeggio in sixteenths: up through two octaves of the chord and back
const ARP = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 3, 2, 1];
const arpNote = (tri, k) => tri[k % 3] + 12 * Math.floor(k / 3) - 12;

export const music = {
  enabled: prefs.music,
  playing: false,
  level: 0,         // 0-based level: more instruments and a bit faster later on
  bpm: 112,
  step: 0,          // position in the loop, in sixteenths
  nextT: 0,         // audio time of the next step
  timer: null,
  bus: null, filter: null, noiseBuf: null,

  setup() {
    const ctx = sound.ctx;
    if (!ctx || this.bus) return !!this.bus;
    this.bus = ctx.createGain(); this.bus.gain.value = 0;
    this.bus.connect(sound.out);
    this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 1800; this.filter.Q.value = 4;
    this.filter.connect(this.bus);
    const n = Math.floor(ctx.sampleRate * .2);
    this.noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return true;
  },

  /** restart: begin the loop from the top (new run) instead of resuming. */
  start(restart = false) {
    if (restart) this.step = 0;
    if (!this.enabled || this.playing || !this.setup()) return;
    const ctx = sound.ctx;
    this.playing = true;
    this.nextT = ctx.currentTime + .08;
    this.bus.gain.cancelScheduledValues(ctx.currentTime);
    this.bus.gain.setTargetAtTime(1, ctx.currentTime, .15);
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  },

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer); this.timer = null;
    const ctx = sound.ctx;
    this.bus.gain.cancelScheduledValues(ctx.currentTime);
    this.bus.gain.setTargetAtTime(0, ctx.currentTime, .08);
  },

  /** 0-based level: 112 bpm on level 1, +2 per level. */
  setLevel(li) { this.level = li; this.bpm = 112 + li * 2; },

  /** speed 0..1+: the arpeggio filter opens up as the ship goes faster. */
  setDrive(speed) {
    if (!this.filter) return;
    const f = 900 + Math.min(1.35, Math.max(0, speed)) * 2600;
    this.filter.frequency.setTargetAtTime(f, sound.ctx.currentTime, .1);
  },

  /** Flips music on/off, remembers it, and returns the new state. */
  toggle(shouldPlay) {
    this.enabled = !this.enabled; prefs.music = this.enabled;
    if (!this.enabled) this.stop();
    else if (shouldPlay) this.start();
    return this.enabled;
  },

  // Look-ahead scheduler: queue every step that starts in the next 0.15 s
  schedule() {
    const ctx = sound.ctx;
    if (!this.playing) return;
    // After a long stall (background tab) skip ahead instead of bursting notes
    if (this.nextT < ctx.currentTime - .2) this.nextT = ctx.currentTime + .02;
    while (this.nextT < ctx.currentTime + .15) {
      this.playStep(this.step, this.nextT);
      this.nextT += 60 / this.bpm / 4;
      this.step = (this.step + 1) % (BARS.length * STEPS);
    }
  },

  playStep(i, t) {
    const bar = Math.floor(i / STEPS), s = i % STEPS, ch = BARS[bar], six = 60 / this.bpm / 4, lv = this.level;
    // Pad: the chord held through the bar, soft
    if (s === 0) for (const n of ch.tri) this.note('sine', midi(n - 12), t, six * 15.5, .024, this.bus, false, .3);
    // Bass: pulsing eighths, root then octave
    if (s % 2 === 0) this.note('sawtooth', midi(ch.bass + (s % 4 === 2 ? 12 : 0)), t, six * 1.6, .055, this.filter);
    if (s % 4 === 0) this.note('triangle', midi(ch.bass), t, six * 2.5, .12, this.bus);
    // Arpeggio in sixteenths through the speed filter
    this.note('square', midi(arpNote(ch.tri, ARP[s])), t, six * .9, .016, this.filter);
    // Lead, with a soft bell an octave up
    for (const [st, n, len] of MELODY[bar]) {
      if (st !== s) continue;
      const dur = six * len * .95;
      this.note('triangle', midi(n), t, dur, .07, this.bus, true);
      this.note('sine', midi(n + 12), t, Math.min(dur, six * 3), .018, this.bus);
    }
    // Later levels: a counter-bell on the offbeats
    if (lv >= 6 && s % 8 === 6) this.note('sine', midi(ch.tri[2] + 24), t, six * 2, .028, this.bus);
    // Drums join as the levels go on
    if (lv >= 4 && s % 4 === 0) this.kick(t);
    if (lv >= 4 && (s === 4 || s === 12)) this.snare(t);
    if (lv >= 2 && s % 2 === 1) this.hat(t);
  },

  /** attack: seconds to fade in (0 = plucked) */
  note(type, f, t, dur, vol, dest, vibrato = false, attack = 0) {
    const ctx = sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (vibrato && dur > .2) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = f * .006;
      lfo.connect(lg).connect(o.frequency); lfo.start(t + .12); lfo.stop(t + dur + .05);
    }
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.max(.01, attack));
    g.gain.setValueAtTime(vol, t + Math.max(dur * .6, attack + .01));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + dur + .02);
  },
  kick(t) {
    const ctx = sound.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
    g.gain.setValueAtTime(.26, t); g.gain.exponentialRampToValueAtTime(.0001, t + .17);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + .19);
  },
  snare(t) {
    const ctx = sound.ctx, src = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuf; bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = .7;
    g.gain.setValueAtTime(.1, t); g.gain.exponentialRampToValueAtTime(.0001, t + .14);
    src.connect(bp).connect(g).connect(this.bus); src.start(t); src.stop(t + .16);
  },
  hat(t) {
    const ctx = sound.ctx, s = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.noiseBuf; hp.type = 'highpass'; hp.frequency.value = 7500;
    g.gain.setValueAtTime(.032, t); g.gain.exponentialRampToValueAtTime(.0001, t + .04);
    s.connect(hp).connect(g).connect(this.bus); s.start(t); s.stop(t + .05);
  },
};
