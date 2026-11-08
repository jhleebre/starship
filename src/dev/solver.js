// Beam-search bot that finds inputs to finish a level, using the game's own
// physics. Used by the level check tool and by autoplay (?autoplay).
// Every 0.15 s it tries all control combinations and keeps the most promising
// ships, with some diversity in speed and height so it can find run-ups.
import { FIXED_DT } from '../config.js';
import { makeLevel } from '../world/generator.js';
import { setTrack, rowOf } from '../world/track.js';
import { createPlayer, resetPlayer, step } from '../world/physics.js';

export const TICKS_PER_ACTION = 18; // 18 * 1/120 s = 0.15 s per decision
const BEAM = 500, PER_BUCKET = 30;

// s: steer -1/0/1, t: throttle 1 up / 0 / -1 down, j: jump at the start
export const ACTIONS = [];
for (const s of [-1, 0, 1]) for (const t of [1, 0, -1]) for (const j of [0, 1]) ACTIONS.push({ s, t, j });

/** Sets the held controls for an action. */
export function applyAction(K, a) {
  K.left = a.s < 0; K.right = a.s > 0; K.up = a.t > 0; K.down = a.t < 0;
}

/**
 * Searches for a way through level li. opts.noFuel turns fuel tiles into plain
 * floor, to check that a level really needs its fuel.
 * Success: {ok:true, actions, time, fuel}; actions are applied one per TICKS_PER_ACTION physics steps.
 * Failure: {ok:false, far, endS, lastDeath, near}.
 */
export function solveLevel(li, opts = {}) {
  const lv = makeLevel(li);
  if (opts.noFuel) lv.rows = lv.rows.map(r => r.replaceAll('f', '#'));
  setTrack(lv);
  const P = createPlayer(), K = {};
  resetPlayer(P);
  let dead = null, won = false;
  const ev = { die: r => { dead = r; P.dead = true; }, win: () => { won = true; } };
  const fuelWorth = lv.tank * .4;
  const pathOf = n => { const out = []; for (; n; n = n.parent) out.push(n.a); return out.reverse(); };

  // Beam entries remember how they got there as a linked list of actions
  let beam = [{ st: { ...P }, node: null }], far = 0, lastDeath = null;
  for (let layer = 0; layer < 2000; layer++) {
    const next = new Map();
    for (const { st, node } of beam) {
      for (const a of ACTIONS) {
        if (a.j && !st.onGround && st.coyote <= 0) continue;
        Object.assign(P, st); dead = null; won = false;
        applyAction(K, a);
        if (a.j) P.jumpBuf = .14;
        for (let i = 0; i < TICKS_PER_ACTION && !dead && !won; i++) step(P, K, lv, FIXED_DT, ev);
        if (won) return { li, ok: true, actions: pathOf({ a, parent: node }), time: (layer + 1) * TICKS_PER_ACTION * FIXED_DT, fuel: P.fuel };
        if (dead) { lastDeath = { reason: dead, s: P.s }; continue; }
        const key = [Math.round(P.x * 3), Math.round(P.s * 2), Math.round(P.vz / 2), Math.round(P.y * 2), P.onGround ? 1 : 0].join();
        // Progress first, plus part of the remaining fuel range (so ships that refuel
        // are not pruned by ones that skipped fuel and are a little further ahead),
        // and penalise ships that are already falling or off the side
        const score = P.s + P.fuel / 100 * fuelWorth - (P.y < -.3 ? 500 : 0) - (Math.abs(P.x) > 3.4 ? 300 : 0);
        const o = next.get(key);
        if (!o || o.score < score) next.set(key, { score, st: { ...P }, node: { a, parent: node } });
      }
    }
    if (!next.size) {
      const r = rowOf(far);
      return { li, ok: false, far, endS: lv.endS, lastDeath, near: lv.rows.slice(r - 3, r + 6) };
    }
    const count = {};
    beam = [...next.values()].sort((a, b) => b.score - a.score).filter(o => {
      const b = Math.floor(o.st.vz / 5) + '_' + (o.st.onGround ? 1 : 0) + '_' + Math.round(o.st.y) + '_' + Math.floor(o.st.fuel / 34);
      return (count[b] = (count[b] || 0) + 1) <= PER_BUCKET;
    }).slice(0, BEAM);
    far = Math.max(far, beam[0].st.s);
  }
  return { li, ok: false, timeout: true, far, endS: lv.endS };
}
