import { STEP, LAT, ACC, BRK, JUMP, CRASH, SLOW_V, REV_V, BOOST_MUL, PAD_H, EMPTY_DECEL } from '../config.js';
import { track, footprint, surfaceType } from './track.js';

// Ship simulation. Pure logic: it never touches rendering, sound or the DOM.
// Things that happen are reported through the `ev` callbacks so the game can
// add sound and effects (and tools can run it headless).

export function createPlayer() {
  const P = {};
  resetPlayer(P);
  return P;
}

export function resetPlayer(P) {
  Object.assign(P, {
    x: 0, y: 0, s: 3, vx: 0, vy: 0, vz: 0, fuel: 100,
    onGround: true, coyote: 0, jumpBuf: 0, boost: 0, stopT: 0,
    lastFuelCell: -1, started: false, dead: false, reason: null,
  });
}

/** Asks for a jump; it happens on the next step the ship can jump (input buffer). */
export function requestJump(P) { P.jumpBuf = .14; }

const noop = () => {};

/**
 * Advances the ship by dt.
 * K: held controls {left,right,up,down}. lv: level from makeLevel().
 * ev: optional callbacks die(reason) win() jump() land(groundY, vy) pad() boost() fuel() bump()
 */
export function step(P, K, lv, dt, ev = {}) {
  const on = name => ev[name] || noop;
  const die = reason => { on('die')(reason); };

  if (P.jumpBuf > 0) P.jumpBuf -= dt;
  // Surface effects
  let onSlow = false;
  if (P.onGround) {
    const [ch, id] = surfaceType(P);
    if (ch === 'x') { die('burn'); return; }
    if (ch === '>') {
      if (P.boost <= 0) on('boost')();
      P.boost = 1; P.vz = Math.max(P.vz, lv.maxV * BOOST_MUL);
    }
    if (ch === '~') onSlow = true;
    if (ch === 'f' && id !== P.lastFuelCell) {
      P.lastFuelCell = id;
      if (P.fuel < 99.5) on('fuel')();
      P.fuel = 100;
    }
    if (ch === 'j') { P.vy = Math.sqrt(2 * lv.g * PAD_H); P.onGround = false; P.coyote = 0; on('pad')(); }
  }

  // Speed
  if (P.boost > 0) P.boost -= dt;
  const cap = onSlow ? SLOW_V : (P.boost > 0 ? lv.maxV * BOOST_MUL : lv.maxV);
  if (K.up && P.fuel > 0) P.vz += ACC * dt;
  if (K.down) {
    // Brake first; holding ↓ a moment after stopping starts reversing
    if (P.vz > 0) { P.vz = Math.max(0, P.vz - BRK * dt); P.stopT = 0; }
    else if ((P.stopT += dt) > .35) P.vz = Math.max(-REV_V, P.vz - ACC * dt);
  } else P.stopT = 0;
  if (P.fuel <= 0) P.vz = P.vz > 0 ? Math.max(0, P.vz - EMPTY_DECEL * dt) : 0;
  if (P.vz > cap) P.vz = Math.max(cap, P.vz - (onSlow ? 45 : 22) * dt);
  if (!K.down && P.vz < 0) P.vz = Math.min(0, P.vz + BRK * dt);
  if (P.vz > 0.01) P.started = true;
  P.fuel = Math.max(0, P.fuel - Math.abs(P.vz) * dt / lv.tank * 100);

  // Steering (less grip in the air)
  const steer = (K.right ? 1 : 0) - (K.left ? 1 : 0);
  P.vx += (steer * LAT - P.vx) * Math.min(1, dt * (P.onGround ? 16 : 9));

  // Jump with a little coyote time and input buffer
  if (P.onGround) P.coyote = .09; else P.coyote -= dt;
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vy = JUMP; P.jumpBuf = 0; P.coyote = 0; P.onGround = false;
    on('jump')();
  }

  // Vertical
  P.vy -= lv.g * dt;
  let ny = P.y + P.vy * dt;
  const f = footprint(P.x, P.s, P.y + STEP);
  if (P.vy <= 0 && ny <= f.g) {
    if (!P.onGround && P.vy < -7) on('land')(f.g, P.vy);
    ny = f.g; P.vy = 0; P.onGround = true;
  } else P.onGround = false;
  P.y = ny;

  // Forward
  const ns = P.s + P.vz * dt;
  if (footprint(P.x, ns, P.y + STEP).wall) {
    if (P.y < -STEP) { die('edge'); return; }
    if (P.vz > CRASH) { die('wall'); return; }
    if (Math.abs(P.vz) > 3) on('bump')();
    P.vz = 0;
  } else P.s = ns;

  // Sideways
  const nx = P.x + P.vx * dt;
  if (footprint(nx, P.s, P.y + STEP).wall) P.vx = 0; else P.x = nx;

  if (P.y < -10) { die('fall'); return; }
  if (P.fuel <= 0 && Math.abs(P.vz) < .3 && P.onGround) { die('fuel'); return; }
  if (P.s >= track.endS && P.y > -.5) on('win')();
}
