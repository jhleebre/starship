import { TL } from '../config.js';
import { SEGMENTS } from '../data/segments.js';
import { LEVELS } from '../data/levels.js';

// Small seeded PRNG (mulberry32) so every level is the same course each time.
export function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const FLOOR = '#######';

/** Lays out level `li` as row strings. Returns rows plus where the finish line starts. */
export function buildRows(li) {
  const L = LEVELS[li], R = rng(li * 7919 + 13), rows = [];
  for (let i = 0; i < 8; i++) rows.push(FLOOR);
  const newest = L.feats[L.feats.length - 1];
  const pool = SEGMENTS.map((s, i) => i).filter(i => L.feats.includes(SEGMENTS[i].f));
  let last = -1;
  for (let n = 0; n < L.segs; n++) {
    rows.push(FLOOR);
    if (L.fuelEvery && n > 0 && n % L.fuelEvery === 0) {
      const c = Math.floor(R() * 5);
      rows.push(FLOOR.slice(0, c) + 'fff' + FLOOR.slice(c + 3));
    } else rows.push(FLOOR);
    // The newest feature shows up more often in the level that introduces it
    let tot = 0;
    const w = pool.map(i => { const v = i === last ? 0 : (SEGMENTS[i].f === newest && li > 0 ? 3 : 1); tot += v; return v; });
    let pick = R() * tot, k = 0;
    while (pick >= w[k]) { pick -= w[k]; k++; }
    last = pool[k];
    const mirror = R() < .5;
    for (const r of SEGMENTS[last].r) rows.push(mirror ? [...r].reverse().join('') : r);
  }
  rows.push(FLOOR, FLOOR, FLOOR);
  const endRow = rows.length;
  for (let i = 0; i < 3; i++) rows.push('EEEEEEE');
  for (let i = 0; i < 6; i++) rows.push(FLOOR);
  return { rows, endRow };
}

/** Level settings plus the values derived from its generated course. */
export function makeLevel(li) {
  const { rows, endRow } = buildRows(li);
  const level = { ...LEVELS[li], index: li, rows, endRow, endS: endRow * TL };
  level.tankDist = rows.length * TL * level.tank;
  return level;
}
